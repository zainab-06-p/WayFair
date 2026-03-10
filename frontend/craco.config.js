const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (config) => {
      const fallback = config.resolve.fallback || {};
      Object.assign(fallback, {
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "assert": require.resolve("assert"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "os": require.resolve("os-browserify/browser"),
        "url": require.resolve("url"),
        "buffer": require.resolve("buffer"),
        "process": require.resolve("process/browser"),
        "vm": require.resolve("vm-browserify")
      });
      config.resolve.fallback = fallback;
      config.resolve.alias = {
        ...config.resolve.alias,
        'process/browser': require.resolve('process/browser')
      };
      config.plugins = (config.plugins || []).concat([
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer']
        })
      ]);
      config.ignoreWarnings = [/Failed to parse source map/];
      config.module.rules.push({
        test: /\.m?js/,
        resolve: {
          fullySpecified: false
        }
      });
      return config;
    }
  }
};
