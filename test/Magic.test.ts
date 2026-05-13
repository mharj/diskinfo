import {type FileHandle, open} from 'node:fs/promises';
import {beforeAll, describe, expect, it} from 'vitest';
import {Magic} from '../src/';

let fdNTFS: FileHandle;
let fdEXT: FileHandle;
let fdLVM2: FileHandle;

describe('FS magic check', function () {
	beforeAll(async function () {
		fdNTFS = await open('./test/ntfs.bin', 'rs+');
		fdEXT = await open('./test/ext.bin', 'rs+');
		fdLVM2 = await open('./test/lvm2.bin', 'rs+');
	});
	it('should check Win NTFS magic', function () {
		const magic = new Magic(fdNTFS);
		expect(magic.haveNtfs(0)).toBe(true);
		expect(magic.haveExt(0)).toBe(false);
	});
	it('should check Linux EXT2/3/4 magic', function () {
		const magic = new Magic(fdEXT);
		expect(magic.haveExt(0)).toBe(true);
		expect(magic.haveNtfs(0)).toBe(false);
	});
	it('should check Linux LVM2 magic', function () {
		const magic = new Magic(fdLVM2);
		expect(magic.haveLvm2(0)).toBe(true);
		expect(magic.haveExt(0)).toBe(false);
		expect(magic.haveNtfs(0)).toBe(false);
	});
});
