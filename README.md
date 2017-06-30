# diskinfo
read disk partition and filesystem information with NodeJS

```bash
npm install mharj/diskinfo --save
```

```javascript
const fs = require("fs");
const scan = require('./diskinfo.js').scan;
const device = '\\\\.\\PHYSICALDRIVE0';
//const device = '/dev/sda';
const fd = fs.openSync(device, 'rs+');
let data = scan(fd);
console.log(data);
```

```javascript
{ partitions:
   [ { active: true,
       type: 7,
       startLBA: 2048,
       partitionSize: 716800,
       endLBA: 718848 },
     { active: false,
       type: 7,
       startLBA: 718848,
       partitionSize: 498475008,
       endLBA: 499193856 },
     { active: false,
       type: 39,
       startLBA: 499193856,
       partitionSize: 921600,
       endLBA: 500115456 },
     { active: false,
       type: 0,
       startLBA: 0,
       partitionSize: 0,
       endLBA: 0 } ],
  uuid: '729c986',
  type: 'MBR' }
```

```javascript
{ partitions:
   [ { type: 'c12a7328-f81f-11d2-ba4b-00a0c93ec93b',
       uuid: '5fa173fd-0850-410e-9c0f-5bc3d2e056a5',
       active: true,
       startLBA: 2048,
       endLBA: 1050623,
       partitionSize: 1048576,
       attributes: 0,
       label: 'EFI_PART' },
     { type: '0fc63daf-8483-4772-8e79-3d69d8477de4',
       uuid: '6ea92768-b99f-48dc-a75c-411cc5cb852e',
       active: true,
       startLBA: 1050624,
       endLBA: 18876415,
       partitionSize: 17825792,
       attributes: 0,
       label: 'Linux Root' },
     { type: '0657fd6d-a4ab-43c4-84e5-0933c84b4f4f',
       uuid: '7c1da61a-bb83-48b7-b2e1-09936e9ea162',
       active: true,
       startLBA: 18876416,
       endLBA: 20969471,
       partitionSize: 2093056,
       attributes: 0,
       label: 'Linux Swap' } ],
  uuid: '29c6b165-daa3-43fb-a56d-449fea36fd3c',
  type: 'GPT' }
```
