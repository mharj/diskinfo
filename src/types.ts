export type MBRPartition = {
	active: boolean;
	type: number;
	startLBA: number;
	partitionSize: number;
	endLBA: number;
};

export type GPTPartition = {
	typeId: string;
	type: string;
	uuid: string;
	active: boolean;
	startLBA: bigint;
	endLBA: bigint;
	partitionSize: bigint;
	attributes: bigint;
	label: string;
};
