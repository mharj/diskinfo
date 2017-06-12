# diskinfo
read disk information with NodeJS

```javascript
const fs = require("fs");
const parseMBR = require('diskinfo').parseMBR;
const device = '\\\\.\\PHYSICALDRIVE0';
//const device = '/dev/sda';
const fd = fs.openSync(device, 'rs+');
let mbr = Buffer.allocUnsafe(512);
let readcount = fs.readSync(fd,mbr,0,mbr.length,0);
let info = parseMBR(mbr);
console.log(info);
```

```javascript
{ gtp: false,
  partitions:
   [ { active: true,
       startCHS: <Buffer 20 21 00>,
       type: 131,
       endCHS: <Buffer fe ff ff>,
       startSector: 2048,
       partitionSize: 6144 },
     { active: false,
       startCHS: <Buffer fe ff ff>,
       type: 5,
       endCHS: <Buffer fe ff ff>,
       startSector: 10238,
       partitionSize: 2 },
     { active: false,
       startCHS: <Buffer 00 00 00>,
       type: 0,
       endCHS: <Buffer 00 00 00>,
       startSector: 0,
       partitionSize: 0 },
     { active: false,
       startCHS: <Buffer 00 00 00>,
       type: 0,
       endCHS: <Buffer 00 00 00>,
       startSector: 0,
       partitionSize: 0 } ],
  uuid: '0b4329' }
```
