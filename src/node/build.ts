import { filePipeline } from '@h7/js-async-pipeline';
import { fastlyBuild } from './steps/fastlyBuild.js';
import { addLoader } from './steps/addLoader.js';
import { ImportMap } from '@h7/importmap-esbuild-plugin';

export type BuildParams = {
  minify?: boolean,
  prodModules?: boolean,
  importMap?: ImportMap,
  importMapBaseDir?: string,
};

export async function build(
  infile: string,
  outfile: string,
  params?: BuildParams,
) {
  await filePipeline(
    infile,
    outfile,
    [
      (infile, outfile) => fastlyBuild(infile, outfile, {
        prodModules: params?.prodModules,
        importMap: params?.importMap,
        importMapBaseDir: params?.importMapBaseDir,
      }),
      (infile, outfile) => addLoader(infile, outfile, {
        minify: params?.minify,
      }),
    ],
  );
}

export { ImportMap };
