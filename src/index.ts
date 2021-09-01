import * as fs from 'fs';
import {gptPartTypes, parseGPT, parseGPTable} from './gptPart';
import {IMbrData, isMbrPartition, parseMBR, partTypes} from './mbrPart';
import {GPTPartition} from './types';
import {readFile} from './util';

export async function scan(fd: number): Promise<IMbrData> {
	const buffer = await readFile(fd, 0, 512, 0);
	let rootMbr = parseMBR(buffer);
	rootMbr.partitions.forEach(async function (p) {
		if (p.type == partTypes.EXTENDED) {
			// Extended partition reading
			if (!isMbrPartition(p)) {
				throw TypeError('we did get GPT partition as extended');
			}
			let extparts = parseMBR(await readFile(fd, 0, 512, 512));
			extparts.partitions.forEach(function (extpart) {
				if (!isMbrPartition(extpart)) {
					throw TypeError('we did get GPT partition as extended');
				}
				if (extpart.type != partTypes.EMPTY) {
					extpart.startLBA = extpart.startLBA + p.startLBA;
					rootMbr.partitions.push(extpart);
				}
			});
		}
		if (p.type == partTypes.GPT) {
			rootMbr.type = 'GPT';
			// GPT partition table reading
			let gpt = parseGPT(await readFile(fd, 0, 512, 512));
			rootMbr.uuid = gpt.uuid;
			let gBuff = Buffer.allocUnsafe(gpt.partitions * gpt.partitionSize);
			fs.readSync(fd, gBuff, 0, gBuff.length, Number(gpt.tableLBA) * 512);
			let partitions: GPTPartition[] = [];
			for (let i = 0; i < gpt.partitions * gpt.partitionSize; i += gpt.partitionSize) {
				let table = parseGPTable(gBuff.slice(i, i + gpt.partitionSize));
				if (table.typeId != gptPartTypes.EMPTY) {
					partitions.push(table);
				}
			}
			rootMbr.partitions = partitions;
		}
	});
	return rootMbr;
}

export class Magic {
	private fd: number;
	constructor(fd: number) {
		this.fd = fd;
	}
	public haveExt(offset: number) {
		let data = Buffer.allocUnsafe(2048);
		fs.readSync(this.fd, data, 0, data.length, 512 * offset);
		return data.readInt16BE(1080) == 0x53ef;
	}
	public haveNtfs(offset: number) {
		let data = Buffer.allocUnsafe(512);
		fs.readSync(this.fd, data, 0, data.length, 512 * offset);
		return data.readInt32BE(3) == 0x4e544653;
	}
	public haveLvm2(offset: number) {
		let data = Buffer.allocUnsafe(1024);
		fs.readSync(this.fd, data, 0, data.length, 512 * offset);
		return data.readInt32BE(536) == 0x4c564d32;
	}
}
