
function parseMBRPartition(part) {
	let out = {};
	out.active = (part.readUInt8(0)==0x80?true:false);
	out.startCHS = Buffer.from([part[1],part[2],part[3]]);
	out.type =part.readUInt8(4);
	out.endCHS = Buffer.from([part[5],part[6],part[7]]);
	out.startSector = part.readUInt16LE(8);
	out.partitionSize = part.readUInt16LE(12);
	return out;
}

function parseMBR(mbr) {
	if ( mbr.length < 512 || mbr[0x1fe] != 85 || mbr[0x1ff] != 170 ) { // MBR signature
		throw Error('no MBR signature or buffer is less than 512 bytes');
	}
	let ret = {};
	ret.gtp = false;
	ret.partitions = [];
	if ( mbr[0x1bc] == 90 && mbr[0x1bc] == 90 ) { // 0x5A5A = copy protected (UEFI)
		ret.copyProtected = true;
	}
	ret.uuid = mbr[0x1bb].toString(16) + mbr[0x1ba].toString(16) + mbr[0x1b9].toString(16) + mbr[0x1b8].toString(16); // DiskID: 1B8 (hex) through 1BE (hex) (looks like reverse)
	for (var i = 446;i <= 508;i += 16) { // MBR table block
		let data = parseMBRPartition(mbr.slice(i,i+15));
		ret.partitions.push(data);
		if ( data.type == 0xEE ) { // we have GTP type : https://www.win.tue.nl/~aeb/partitions/partition_types-1.html
			ret.gtp = true;
		}
	}	
	return ret;
}
module.exports.parseMBR = parseMBR;
