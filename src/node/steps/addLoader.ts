import { dirname, isAbsolute, resolve } from 'node:path';

import esbuild, { type Plugin } from 'esbuild';

import { filePipeline } from "@h7/js-async-pipeline";

export type AddLoaderParams = {
  minify?: boolean,
};

export async function addLoader(
  infile: string,
  outfile: string,
  params?: AddLoaderParams,
) {
  await filePipeline(
    infile,
    outfile,
    [
      wrapTopLevel,
      (infile, outfile) => wrapLoader(infile, outfile, { minify: params?.minify }),
    ]
  )
}

export async function wrapTopLevel(
  infile: string,
  outfile: string,
) {
  await esbuild.build({
    entryPoints: [ infile ],
    bundle: true,
    outfile,
    plugins: [
      wrapTopLevelPlugin({entry:infile}),
    ],
    format: 'esm',
  });
}

export type WrapTopLevelPluginParams = {
  entry: string,
};

function wrapTopLevelPlugin(opts: WrapTopLevelPluginParams) {
  const { entry } = opts;

  const name = 'wrap-top-level';
  const namespace = 'wrap-top-level';
  if (!entry) throw new Error(`[${name}] You must provide opts.entry`);

  // Normalize once so our onResolve comparison is exact.
  const normalizedEntry = resolve(entry);

  return {
    name,
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        const maybeEntry = isAbsolute(args.path)
          ? args.path
          : resolve(args.resolveDir || process.cwd(), args.path);
        if (args.kind === 'entry-point' && maybeEntry === normalizedEntry) {
          return { path: normalizedEntry, namespace };
        }
        return null;
      });
      build.onLoad({ filter: /.*/, namespace }, (args) => {
        // Generate a default function wrapper that imports the real entry.
        return {
          contents: `\
export default async function() { 
    return import (${JSON.stringify(args.path)});
}
                    `,
          loader: 'js',
          resolveDir: dirname(args.path),
        };
      });
    },
  } satisfies Plugin;
}

export type WrapLoaderParams = {
  globalName?: string,
  minify?: boolean,
};

async function wrapLoader(
  infile: string,
  outfile: string,
  params?: WrapLoaderParams,
) {
  const globalName = params?.globalName ?? '__dyn_module_wrapper';
  const minify = params?.minify ?? true;

  await esbuild.build({
    entryPoints: [ infile ],
    bundle: true,
    minify,
    outfile,
    globalName,
    format: 'iife',
  });
}
