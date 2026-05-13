import type {FileHandle} from 'node:fs/promises';
import {gptPartTypes, parseGPT, parseGPTable} from './gptPart';
import {type GptData, type IMbrData, isMbrPartition, parseMBR, partTypes} from './mbrPart';
import type {GPTPartition, MBRPartition} from './types';

async function getMbrPartitions(handle: FileHandle, startLBA: number) {
	const buffer = Buffer.allocUnsafe(512);
	await handle.read(buffer, 0, 512, 512);
	const output: (MBRPartition & GPTPartition)[] = [];
	const extparts = parseMBR(buffer);
	for (const extpart of extparts.partitions) {
		if (!isMbrPartition(extpart)) {
			throw TypeError('we did get GPT partition as extended');
		}
		if (extpart.type !== partTypes.EMPTY) {
			extpart.startLBA = extpart.startLBA + startLBA;
			output.push(extpart as MBRPartition & GPTPartition);
		}
	}
	return output;
}

async function getGptPartitions(handle: FileHandle): Promise<{uuid: string; partitions: GPTPartition[]}> {
	const buffer = Buffer.allocUnsafe(512);
	await handle.read(buffer, 0, 512, 512);
	const gpt = parseGPT(buffer);
	const gBuff = Buffer.allocUnsafe(gpt.partitions * gpt.partitionSize);
	const partitions: GPTPartition[] = [];
	for (let i = 0; i < gpt.partitions * gpt.partitionSize; i += gpt.partitionSize) {
		const table = parseGPTable(gBuff.subarray(i, i + gpt.partitionSize));
		if (table.typeId !== gptPartTypes.EMPTY) {
			partitions.push(table);
		}
	}
	return {uuid: gpt.uuid, partitions};
}

function isGptPartition(root: IMbrData, part: MBRPartition | GPTPartition): root is GptData {
	return part.type === partTypes.GPT;
}

function isExtendedPartition(part: MBRPartition | GPTPartition): part is MBRPartition {
	return part.type === partTypes.EXTENDED;
}

export async function scan(handle: FileHandle): Promise<IMbrData> {
	const buffer = Buffer.allocUnsafe(512);
	await handle.read(buffer, 0, 512, 0);
	const rootMbr = parseMBR(buffer) as IMbrData;
	for (const p of rootMbr.partitions) {
		if (isExtendedPartition(p)) {
			rootMbr.partitions.push(...(await getMbrPartitions(handle, p.startLBA)));
		}
		if (isGptPartition(rootMbr, p)) {
			const {partitions, uuid} = await getGptPartitions(handle);
			rootMbr.type = 'GPT';
			rootMbr.partitions = partitions;
			rootMbr.uuid = uuid;
		}
	}
	return rootMbr;
}
