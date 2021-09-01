import * as uuidParse from 'uuid-parse';
import * as iconv from 'iconv-lite';
import {GPTPartition, MBRPartition} from './types';

const EFI_PART = Buffer.from([0x45, 0x46, 0x49, 0x20, 0x50, 0x41, 0x52, 0x54]);

export const gptPartTypes = Object.freeze({
	EMPTY: '00000000-0000-0000-0000-000000000000',
	MBR: '024dee41-33e7-11d3-9d69-0008c781f39f',
	EFI: 'c12a7328-f81f-11d2-ba4b-00a0c93ec93b',
	LINUX: '0fc63daf-8483-4772-8e79-3d69d8477de4',
	LINUX_SWAP: '0657fd6d-a4ab-43c4-84e5-0933c84b4f4f',
	LINUX_LVM: 'e6d6d379-f507-44c2-a23c-238f2a3df928',
	LINUX_RAID: 'a19d880f-05fc-4d3b-a006-743f0f84911e',
	MSR: 'e3c9e316-0b5c-4db8-817d-f92df00215ae',
	BASIC_DATA: 'ebd0a0a2-b9e5-4433-87c0-68b6b72699c7',
	getName: function (val: string): string {
		// print names for values
		for (let k in gptPartTypes) {
			if (gptPartTypes[k] === val) {
				return k;
			}
		}
		return 'Unknown';
	},
});

export interface IGtpData {
	revision: string;
	headerSize: number;
	headerCRC32: number;
	currentLBA: bigint;
	backupLBA: bigint;
	firstUsableLBA: bigint;
	lastUsableLBA: bigint;
	uuid: string;
	tableLBA: bigint;
	partitions: number;
	partitionSize: number;
	partitionCRC32: number;
}

function readUuidBytes(buf: Buffer, pos: number) {
	return Buffer.from([
		buf[pos + 3],
		buf[pos + 2],
		buf[pos + 1],
		buf[pos + 0],
		buf[pos + 5],
		buf[pos + 4],
		buf[pos + 7],
		buf[pos + 6],
		buf[pos + 8],
		buf[pos + 9],
		buf[pos + 10],
		buf[pos + 11],
		buf[pos + 12],
		buf[pos + 13],
		buf[pos + 14],
		buf[pos + 15],
	]);
}

export function parseGPTable(buf: Buffer): GPTPartition {
	const typeId = uuidParse.unparse(readUuidBytes(buf, 0));
	const uuid = uuidParse.unparse(readUuidBytes(buf, 16));
	const startLBA = buf.readBigUInt64LE(32);
	const endLBA = buf.readBigUInt64LE(40);
	return {
		typeId,
		type: gptPartTypes.getName(typeId),
		uuid,
		active: uuid == gptPartTypes.EMPTY ? false : true,
		startLBA,
		endLBA,
		partitionSize: endLBA - startLBA + 1n, // +1?
		attributes: buf.readBigUInt64BE(48),
		label: iconv.decode(buf.slice(56, 128), 'utf16le').split('\u0000')[0], // bit hack in here
	};
}

export function parseGPT(buf: Buffer): IGtpData {
	// https://en.wikipedia.org/wiki/GUID_Partition_Table
	if (buf.indexOf(EFI_PART) != 0) {
		throw Error('not GTP entry');
	}
	return {
		revision: buf[8] + '.' + buf[9] + '.' + buf[10] + '.' + buf[11],
		headerSize: buf.readUInt32LE(12),
		headerCRC32: buf.readUInt32LE(16),
		// buf.readUInt32LE(20); // reserved; must be zero
		currentLBA: buf.readBigUInt64LE(24),
		backupLBA: buf.readBigUInt64LE(32),
		firstUsableLBA: buf.readBigUInt64LE(40),
		lastUsableLBA: buf.readBigUInt64LE(48),
		uuid: uuidParse.unparse(readUuidBytes(buf, 56)),
		tableLBA: buf.readBigUInt64LE(72),
		partitions: buf.readUInt32LE(80),
		partitionSize: buf.readUInt32LE(84),
		partitionCRC32: buf.readUInt32LE(88),
	};
}

export function isGptPartition(part: MBRPartition | GPTPartition): part is GPTPartition {
	return typeof part.type === 'string';
}
