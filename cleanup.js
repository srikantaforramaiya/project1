const fs = require("fs");
const mine = [
  "probe-live.js","probe2.js","probe3.js",
  "probe-out.txt","probe-out2.txt","probe2-out.txt","probe3-out.txt",
  "nv.txt","dir-nm.txt","zipcheck.txt",
  "gen.txt","gen2.txt","gen3.txt","gen4.txt","gen5.txt","gen6.txt","gen7.txt","gen8.txt",
  "pyout.txt","pyout2.txt","pyout3.txt","pyout4.txt","pyout5.txt",
  "findout.txt","findout2.txt","crcout.txt","crcout2.txt",
  "fc.txt","st.txt","gitstatus.txt",
  "final-check.js","crc-test.js","verify-xlsx.js","find_bad.py","validate_xlsx.py"
];
let removed = 0;
for (const f of mine) { if (fs.existsSync(f)) { fs.unlinkSync(f); removed++; } }
console.log("removed " + removed + " temp files");