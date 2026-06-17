import {type FileHandle, open, readFile} from 'node:fs/promises';
import crc32 from 'buffer-crc32';
import {beforeAll, describe, expect, it} from 'vitest';
import {scan} from '../src/';
import {gptPartTypes, type IGtpData, parseGPT, parseGPTable} from '../src/gptPart';
import {parseMBR, partTypes} from '../src/mbrPart';

let gptData: Buffer;
let mbrData: Buffer;
let gtpInfo: IGtpData;
let handleMbr: FileHandle;
let handlerGpt: FileHandle;
let handleLinuxMbr: FileHandle;

describe('diskinfo', function () {
	beforeAll(async function () {
		gptData = await readFile('./test/gtp.bin');
		mbrData = await readFile('./test/mbr.bin');
		handleMbr = await open('./test/mbr.bin', 'rs+');
		handleLinuxMbr = await open('./test/linuxmbr.bin', 'rs+');
		handlerGpt = await open('./test/gtp.bin', 'rs+');
	});
	describe('partitions', function () {
		it('should parse mbr info', function () {
			const info = parseMBR(mbrData);
			expect(typeof info.uuid).toBe('string');
			expect(info.uuid).toBe('a83f8008');
			expect(Array.isArray(info.partitions)).toBe(true);
			for (const partition of info.partitions) {
				expect(Object.keys(partition).sort()).toEqual(['active', 'endLBA', 'partitionSize', 'startLBA', 'type']);
			}
		});
		it('should parse gtp info', function () {
			const info = parseMBR(gptData);
			expect(info.partitions[0].type).toBe(partTypes.GPT);
			gtpInfo = parseGPT(gptData.subarray(512, 1024));
			expect(gtpInfo.revision).toBe('0.0.1.0');
			expect(gtpInfo.headerSize).toBe(92);
			// check header crc32
			const crcbuff = gptData.subarray(512, 512 + gtpInfo.headerSize);
			crcbuff[16] = 0; // zero current crc32 for check
			crcbuff[17] = 0;
			crcbuff[18] = 0;
			crcbuff[19] = 0;
			expect(gtpInfo.headerCRC32).toBe(crc32.unsigned(crcbuff));
			expect(gtpInfo.uuid).toBe('29c6b165-daa3-43fb-a56d-449fea36fd3c');
		});
		it('should parse gtp table info', function () {
			for (
				let i = Number(gtpInfo.tableLBA) * 512;
				i < Number(gtpInfo.tableLBA) * 512 + gtpInfo.partitions * gtpInfo.partitionSize;
				i += gtpInfo.partitionSize
			) {
				const table = parseGPTable(gptData.subarray(i, i + gtpInfo.partitionSize));
				if (i === 1024) {
					const startLBA = 0x800n;
					const endLBA = 0x1007ffn;
					expect(table.typeId).toBe(gptPartTypes.EFI); // EFI
					expect(table.type).toBe(gptPartTypes.getName(table.typeId));
					expect(table.label).toBe('EFI_PART');
					expect(table.active).toBe(true);
					expect(table.attributes).toBe(0n);
					expect(table.startLBA).toBe(startLBA);
					expect(table.endLBA).toBe(endLBA);
					expect(table.partitionSize).toBe(endLBA - startLBA + 1n);
					expect(table.uuid).toBe('5fa173fd-0850-410e-9c0f-5bc3d2e056a5');
				}
				if (i === 1152) {
					const startLBA = 0x100800n;
					const endLBA = 0x12007ffn;
					expect(table.typeId).toBe(gptPartTypes.LINUX); // Linux partition
					expect(table.type).toBe(gptPartTypes.getName(table.typeId));
					expect(table.label).toBe('Linux Root');
					expect(table.active).toBe(true);
					expect(table.attributes).toBe(0n);
					expect(table.startLBA).toBe(startLBA);
					expect(table.endLBA).toBe(endLBA);
					expect(table.partitionSize).toBe(endLBA - startLBA + 1n);
					expect(table.uuid).toBe('6ea92768-b99f-48dc-a75c-411cc5cb852e');
				}
				if (i === 1280) {
					const startLBA = 0x1200800n;
					const endLBA = 0x13ff7ffn;
					expect(table.typeId).toBe(gptPartTypes.LINUX_SWAP); // Linux Swap
					expect(table.type).toBe(gptPartTypes.getName(table.typeId));
					expect(table.label).toBe('Linux Swap');
					expect(table.active).toBe(true);
					expect(table.attributes).toBe(0n);
					expect(table.startLBA).toBe(startLBA);
					expect(table.endLBA).toBe(endLBA);
					expect(table.partitionSize).toBe(endLBA - startLBA + 1n);
					expect(table.uuid).toBe('7c1da61a-bb83-48b7-b2e1-09936e9ea162');
				}
				if (i === 1408) {
					const startLBA = 0x13ff800n;
					const endLBA = 0x13fffddn;
					expect(table.typeId).toBe(gptPartTypes.MSR); // Microsoft reserved partition
					expect(table.type).toBe(gptPartTypes.getName(table.typeId));
					expect(table.label).toBe('Microsoft reserved partition');
					expect(table.active).toBe(true);
					expect(table.attributes).toBe(0n);
					expect(table.startLBA).toBe(startLBA);
					expect(table.endLBA).toBe(endLBA);
					expect(table.partitionSize).toBe(endLBA - startLBA + 1n);
					expect(table.uuid).toBe('d102eb4b-2e28-4449-8c4f-2ae1ab46dc32');
				}
				if (i === 1536) {
					const startLBA = 0x13fffden;
					const endLBA = 0x17adf5dn;
					expect(table.typeId).toBe(gptPartTypes.BASIC_DATA); // Basic data partition
					expect(table.type).toBe(gptPartTypes.getName(table.typeId));
					expect(table.label).toBe('Basic data partition');
					expect(table.active).toBe(true);
					expect(table.attributes).toBe(0x80n);
					expect(table.startLBA).toBe(startLBA);
					expect(table.endLBA).toBe(endLBA);
					expect(table.partitionSize).toBe(endLBA - startLBA + 1n);
					expect(table.uuid).toBe('9a6ea671-a597-4ae2-90d4-75fdaede55ce');
				}
			}
		});
	});
	describe('test async scan', function () {
		it('should scan windows mbr', async () => {
			const data = await scan(handleMbr);
			expect(data.copyProtected).toBe(false);
			expect(data.uuid).toBe('a83f8008');
			for (const partition of data.partitions) {
				expect(Object.keys(partition).sort()).toEqual(['active', 'endLBA', 'partitionSize', 'startLBA', 'type']);
			}
		});
		it('should scan linux mbr', async () => {
			const data = await scan(handleLinuxMbr);
			expect(data.copyProtected).toBe(false);
			expect(data.uuid).toBe('b63a8b78');
			for (const partition of data.partitions) {
				expect(Object.keys(partition).sort()).toEqual(['active', 'endLBA', 'partitionSize', 'startLBA', 'type']);
			}
		});
		it('should scan gpt', async () => {
			const data = await scan(handlerGpt);
			expect(data.copyProtected).toBe(false);
			expect(data.uuid).toBe('29c6b165-daa3-43fb-a56d-449fea36fd3c');
			for (const partition of data.partitions) {
				expect(Object.keys(partition).sort()).toEqual(['active', 'attributes', 'endLBA', 'label', 'partitionSize', 'startLBA', 'type', 'typeId', 'uuid']);
			}
		});
	});
});
