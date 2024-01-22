import {defineConfig, mergeConfig} from "vitest/config";
import vitestConfig from "../../vitest.base.config";
import {buildTargetPlugin} from "../../scripts/vitest/plugins/buildTargetPlugin.js";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    // We need to change the build target to test code which is based on `using` keyword
    // Note this target is not fully supported for the browsers
    plugins: [buildTargetPlugin("es2022")],
    test: {
      globalSetup: ["./test/globalSetup.ts"],
    },
  })
);
