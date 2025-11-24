import esbuild from 'esbuild';
import { httpImportEsbuildPlugin } from '@h7/http-import-esbuild-plugin';

export async function bundleWithHttpImports(
  infile: string,
  outfile: string,
) {
  await esbuild.build({
    entryPoints: [ infile ],
    bundle: true,
    outfile,
    plugins: [
      httpImportEsbuildPlugin({
        onLog(m) { console.log(m); }
      }),
    ],
    external: [
      'fastly:*',
    ],
    format: 'esm',
  });
}
