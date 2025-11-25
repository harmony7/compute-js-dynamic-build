import { filePipeline } from '@h7/js-async-pipeline';
import { bundleWithHttpImports } from './steps/bundleWithHttpImports.js';
import { fastlyBuild } from './steps/fastlyBuild.js';
import { addLoader } from './steps/addLoader.js';

export type BuildParams = {
  minify?: boolean,
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
      bundleWithHttpImports,
      fastlyBuild,
      (infile, outfile) => addLoader(infile, outfile, { minify: params?.minify }),
    ],
  );
}
