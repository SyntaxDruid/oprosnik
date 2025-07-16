const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: {
    popup: './oprosnik-extension/popup.tsx',
    background: './oprosnik-extension/background.js',
    'scripts/filler': './oprosnik-extension/scripts/filler.js',
    'scripts/form-modifier': './oprosnik-extension/scripts/form-modifier.js',
    'scripts/parser': './oprosnik-extension/scripts/parser.js',
    'scripts/sidebar-delay': './oprosnik-extension/scripts/sidebar-delay.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  optimization: {
    minimize: true,
    splitChunks: false,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          format: {
            comments: false,
          },
        },
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript'
            ]
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'oprosnik-extension/manifest.json', to: 'manifest.json' },
        { from: 'oprosnik-extension/popup.html', to: 'popup.html' },
        { from: 'oprosnik-extension/config.json', to: 'config.json' },
        { from: 'oprosnik-extension/tips.json', to: 'tips.json' },
        { from: 'oprosnik-extension/icons', to: 'icons' },
        { from: 'oprosnik-extension/css', to: 'css' }
      ]
    })
  ]
};