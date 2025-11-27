import { readFile, writeFile } from 'node:fs/promises';

import { parse } from 'acorn';
import { simple as simpleWalk } from 'acorn-walk';
import esbuild, { type Plugin } from 'esbuild';
import MagicString from 'magic-string';
import regexpuc from 'regexpu-core';
import { filePipeline } from '@h7/js-async-pipeline';
import { importMapEsbuildPlugin, ImportMap } from "@h7/importmap-esbuild-plugin";

export type FastlyBuildParams = {
  importMap?: ImportMap,
  importMapBaseDir?: string,
};

export async function fastlyBuild(
  infile: string,
  outfile: string,
  params?: FastlyBuildParams,
) {
  await filePipeline(
    infile,
    outfile,
    [
      (infile, outfile) => buildForFastlyCompute(infile, outfile, {
        importMap: params?.importMap,
        importMapBaseDir: params?.importMapBaseDir,
      }),
      precompileRegexes,
    ],
  );
}

export type BuildForFastlyComputeParams = {
  importMap?: ImportMap,
  importMapBaseDir?: string,
};

async function buildForFastlyCompute(
  infile: string,
  outfile: string,
  params?: BuildForFastlyComputeParams,
) {
  await esbuild.build({
    entryPoints: [infile],
    bundle: true,
    outfile,
    plugins: [
      importMapEsbuildPlugin({
        importMap: params?.importMap,
        baseDir: params?.importMapBaseDir,
        enableHttp: true,
        timeoutMs: 30_000,
        onLog(m) { console.log(m); },
      }),
      fastlyPlugin(),
    ],
    format: 'esm',
  });
}

function fastlyPlugin() {
  return {
    name: 'fastly',
    setup(build) {
      build.onResolve({filter: /^fastly:.*/}, (args) => {
        return {
          path: args.path.replace('fastly:', ''),
          namespace: 'fastly',
        };
      });
      build.onLoad({filter: /^.*/, namespace: 'fastly'}, async (args) => {
        switch (args.path) {
          case 'acl': {
            return {
              contents: `\
export const Acl = globalThis.Acl;
`,
            };
          }
          case 'backend': {
            return {
              contents: `\
export const Backend = globalThis.Backend;
export const setDefaultDynamicBackendConfig = Object.getOwnPropertyDescriptor(globalThis.fastly, 'allowDynamicBackends').set;
const allowDynamicBackends = Object.getOwnPropertyDescriptor(globalThis.fastly, 'allowDynamicBackends').set;
export const setDefaultBackend = Object.getOwnPropertyDescriptor(globalThis.fastly, 'defaultBackend').set;
export function enforceExplicitBackends (defaultBackend) {
  allowDynamicBackends(false);
  if (defaultBackend) setDefaultBackend(defaultBackend);
}
`,
            };
          }
          case 'body': {
            return {
              contents: `\
export const FastlyBody = globalThis.FastlyBody;
`,
            };
          }
          case 'cache-override': {
            return {
              contents: `\
export const CacheOverride = globalThis.CacheOverride;
`,
            };
          }
          case 'config-store': {
            return {
              contents: `\
export const ConfigStore = globalThis.ConfigStore;
`,
            };
          }
          case 'dictionary': {
            return {
              contents: `\
export const Dictionary = globalThis.Dictionary;
`,
            };
          }
          case 'device': {
            return {
              contents: `\
export const Device = globalThis.Device;
`,
            };
          }
          case 'edge-rate-limiter': {
            return {
              contents: `\
export const RateCounter = globalThis.RateCounter;
export const PenaltyBox = globalThis.PenaltyBox;
export const EdgeRateLimiter = globalThis.EdgeRateLimiter;
`,
            };
          }
          case 'env': {
            return {
              contents: `\
export const env = globalThis.fastly.env.get;
`,
            };
          }
          case 'experimental': {
            return {
              contents: `\
export const includeBytes = globalThis.fastly.includeBytes;
export const enableDebugLogging = globalThis.fastly.enableDebugLogging;
export const setBaseURL = Object.getOwnPropertyDescriptor(globalThis.fastly, 'baseURL').set;
export const setDefaultBackend = Object.getOwnPropertyDescriptor(globalThis.fastly, 'defaultBackend').set;
export const allowDynamicBackends = Object.getOwnPropertyDescriptor(globalThis.fastly, 'allowDynamicBackends').set;
export const sdkVersion = globalThis.fastly.sdkVersion;
export const mapAndLogError = (e) => globalThis.__fastlyMapAndLogError(e);
export const mapError = (e) => globalThis.__fastlyMapError(e);
`,
            };
          }
          case 'fanout': {
            return {
              contents: `\
export const createFanoutHandoff = globalThis.fastly.createFanoutHandoff;
`,
            };
          }
          case 'websocket': {
            return {
              contents: `\
export const createWebsocketHandoff = globalThis.fastly.createWebsocketHandoff;
`,
            };
          }
          case 'geolocation': {
            return {
              contents: `\
export const getGeolocationForIpAddress = globalThis.fastly.getGeolocationForIpAddress;
`,
            };
          }
          case 'logger': {
            return {
              contents: `\
export const Logger = globalThis.Logger;
export const configureConsole = Logger.configureConsole;
delete globalThis.Logger.configureConsole;
`,
            };
          }
          case 'kv-store': {
            return {
              contents: `\
export const KVStore = globalThis.KVStore;
`,
            };
          }
          case 'secret-store': {
            return {
              contents: `\
export const SecretStore = globalThis.SecretStore;export const SecretStoreEntry = globalThis.SecretStoreEntry;
`,
            };
          }
          case 'cache': {
            return {
              contents: `\
export const CacheEntry = globalThis.CacheEntry;
export const CacheState = globalThis.CacheState;
export const CoreCache = globalThis.CoreCache;
export const SimpleCache = globalThis.SimpleCache;
export const SimpleCacheEntry = globalThis.SimpleCacheEntry;
export const TransactionCacheEntry = globalThis.TransactionCacheEntry;
`,
            };
          }
          case 'compute': {
            return {
              contents: `\
export const { purgeSurrogateKey, vCpuTime } = globalThis.fastly;
`,
            };
          }
          case 'html-rewriter': {
            return {
              contents: `\
export const HTMLRewritingStream = globalThis.HTMLRewritingStream;
`,
            };
          }
          case 'image-optimizer': {
            return {
              contents: `\
export const { 
  Region, Auto, Format, BWAlgorithm, Disable, Enable, Fit, Metadata, 
  Optimize, Orient, Profile, ResizeFilter, CropMode, optionsToQueryString
} = globalThis.fastly.imageOptimizer;
`,
            };
          }
        }
      });
    },
  } satisfies Plugin;
}

async function precompileRegexes(
  input: string,
  outfile: string,
) {
  const source = await readFile(input, {encoding: 'utf8'});
  const magicString = new MagicString(source);

  // PRECOMPILE REGEXES
  // Emit a block of javascript that will pre-compile the regular expressions given. As spidermonkey
  // will intern regular expressions, duplicating them at the top level and testing them with both
  // an ascii and utf8 string should ensure that they won't be re-compiled when run in the fetch
  // handler.
  const PREAMBLE = `(function(){
  // Precompiled regular expressions
  const precompile = (r) => { r.exec('a'); r.exec('\\u1000'); };`;
  const POSTAMBLE = '})();';

  const ast = parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
  });

  const precompileCalls: string[] = [];
  simpleWalk(ast, {
    Literal(node) {
      if (!node.regex) return;
      let transpiledPattern;
      try {
        transpiledPattern = regexpuc(node.regex.pattern, node.regex.flags, {
          unicodePropertyEscapes: 'transform',
        });
      } catch {
        // swallow regex parse errors here to instead throw them at the engine level
        // this then also avoids regex parser bugs being thrown unnecessarily
        transpiledPattern = node.regex.pattern;
      }
      const transpiledRegex = `/${transpiledPattern}/${node.regex.flags}`;
      precompileCalls.push(`precompile(${transpiledRegex});`);
      magicString.overwrite(node.start, node.end, transpiledRegex);
    },
  });

  if (precompileCalls.length) {
    magicString.prepend(`${PREAMBLE}${precompileCalls.join('')}${POSTAMBLE}\n`);
  }

  await writeFile(outfile, magicString.toString());
}
