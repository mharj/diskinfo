import {GPTPartition, MBRPartition} from './types';

export const partTypes = {
	EMPTY: 0x00,
	EXTENDED: 0x05,
	NTFS: 0x07,
	LINUX_SWAP: 0x82,
	LINUX: 0x83,
	LINUX_EXTENDED: 0x85,
	LINUX_LVM: 0x8e,
	GPT: 0xee,
	EFI: 0xef,
	LINUX_RAID: 0xfd,
	getName: function (val: number): string {
		// print names for values
		for (let k in partTypes) {
			if (partTypes[k] === val) {
				return k;
			}
		}
		return 'Unknown';
	},
};

export interface IMbrData {
	copyProtected: boolean;
	uuid: string;
	type: 'MBR' | 'GPT';
	partitions: (MBRPartition | GPTPartition)[];
}

export function parseMBR(mbr: Buffer): IMbrData {
	if (mbr.length < 512 || mbr[0x1fe] != 85 || mbr[0x1ff] != 170) {
		// MBR signature
		throw Error('no MBR signature or buffer is less than 512 bytes');
	}
	let ret: IMbrData = {
		copyProtected: mbr[0x1bc] == 90 && mbr[0x1bc] == 90 ? true : false,
		uuid: Buffer.from([mbr[0x1bb], mbr[0x1ba], mbr[0x1b9], mbr[0x1b8]]).toString('hex'), // DiskID: 1B8 (hex) through 1BE (hex) (looks like reverse)
		partitions: [],
		type: 'MBR', // as default
	};
	for (let i = 446; i <= 508; i += 16) {
		// MBR table blocks
		ret.partitions.push(parseMBRPartition(mbr.slice(i, i + 16)));
	}
	return ret;
}

function parseMBRPartition(part: Buffer): MBRPartition {
	const startLBA = part.readUInt32LE(8);
	const partitionSize = part.readUInt32LE(12);
	return {
		active: part.readUInt8(0) == 0x80 ? true : false,
		type: part.readUInt8(4),
		startLBA,
		partitionSize,
		endLBA: startLBA + partitionSize,
	};
}

export function isMbrPartition(part: MBRPartition | GPTPartition): part is MBRPartition {
	return typeof part.type === 'number';
}
