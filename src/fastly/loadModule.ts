export async function loadModule(
  moduleText: string
) {
  eval(moduleText + '\n' + 'globalThis.__load_dyn_module = __dyn_module_wrapper.default;');
  return await (globalThis as any).__load_dyn_module();
}
