import fs from 'node:fs';

export class Magic {
	private fd: number;
	public constructor(fd: number) {
		this.fd = fd;
	}
	public haveExt(offset: number) {
		const data = Buffer.allocUnsafe(2048);
		fs.readSync(this.fd, data, 0, data.length, 512 * offset);
		return data.readInt16BE(1080) === 0x53ef;
	}
	public haveNtfs(offset: number) {
		const data = Buffer.allocUnsafe(512);
		fs.readSync(this.fd, data, 0, data.length, 512 * offset);
		return data.readInt32BE(3) === 0x4e544653;
	}
	public haveLvm2(offset: number) {
		const data = Buffer.allocUnsafe(1024);
		fs.readSync(this.fd, data, 0, data.length, 512 * offset);
		return data.readInt32BE(536) === 0x4c564d32;
	}
}
