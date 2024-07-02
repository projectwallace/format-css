import { Bench } from "tinybench"
import { withCodSpeed } from "@codspeed/tinybench-plugin"
import * as fs from "fs"
import { format } from '../index.js'

let filelist = fs.readdirSync('./benchmarks/__fixtures__')

let bench = withCodSpeed(new Bench())

for (let filename of filelist) {
	let css = fs.readFileSync(`./benchmarks/__fixtures__/${filename}`, 'utf8')
	let byte_size = (Buffer.byteLength(css) / 1024).toFixed(1)
	bench.add(`${filename} (${byte_size}kB)`, () => format(css))
}

await bench.warmup()
await bench.run()

console.table(bench.table())
