import fs from 'node:fs';
import {gptPartTypes, parseGPT, parseGPTable} from './gptPart';
import {type IMbrData, isMbrPartition, parseMBR, partTypes} from './mbrPart';
import type {GPTPartition, MBRPartition} from './types';
import {readFile} from './util';

export async function scan(fd: number): Promise<IMbrData> {
	const buffer = await readFile(fd, 0, 512, 0);
	const rootMbr = parseMBR(buffer) as IMbrData;
	rootMbr.partitions.forEach(async function (p) {
		if (p.type === partTypes.EXTENDED) {
			// Extended partition reading
			if (!isMbrPartition(p)) {
				throw TypeError('we did get GPT partition as extended');
			}
			const extparts = parseMBR(await readFile(fd, 0, 512, 512));
			extparts.partitions.forEach(function (extpart) {
				if (!isMbrPartition(extpart)) {
					throw TypeError('we did get GPT partition as extended');
				}
				if (extpart.type !== partTypes.EMPTY) {
					extpart.startLBA = extpart.startLBA + p.startLBA;
					rootMbr.partitions.push(extpart as MBRPartition & GPTPartition);
				}
			});
		}
		if (p.type === partTypes.GPT) {
			rootMbr.type = 'GPT';
			// GPT partition table reading
			const gpt = parseGPT(await readFile(fd, 0, 512, 512));
			rootMbr.uuid = gpt.uuid;
			const gBuff = Buffer.allocUnsafe(gpt.partitions * gpt.partitionSize);
			fs.readSync(fd, gBuff, 0, gBuff.length, Number(gpt.tableLBA) * 512);
			const partitions: GPTPartition[] = [];
			for (let i = 0; i < gpt.partitions * gpt.partitionSize; i += gpt.partitionSize) {
				const table = parseGPTable(gBuff.slice(i, i + gpt.partitionSize));
				if (table.typeId !== gptPartTypes.EMPTY) {
					partitions.push(table);
				}
			}
			rootMbr.partitions = partitions;
		}
	});
	return rootMbr;
}
