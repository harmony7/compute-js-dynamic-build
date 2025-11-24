import { bundleWithHttpImports } from './steps/bundleWithHttpImports.js';
import { fastlyBuild } from './steps/fastlyBuild.js';
import { addLoader } from './steps/addLoader.js';
import { filePipeline } from '@h7/js-async-pipeline';

export async function build(
  infile: string,
  outfile: string,
) {
  await filePipeline(
    infile,
    outfile,
    [
      bundleWithHttpImports,
      fastlyBuild,
      addLoader,
    ],
  );
}
