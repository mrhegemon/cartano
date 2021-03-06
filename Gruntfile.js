var MockBrowser = require('mock-browser').mocks.MockBrowser;
global.window = MockBrowser.createWindow();


module.exports = function(grunt) {
	grunt.initConfig({
		package: grunt.file.readJSON('package.json'),

		buildit: {
			dist: {
				options: {
					baseUrl: '.',
					name: '<%= package.name %>',
					exports: 'src/cartano'
				},
				dest: 'dist/<%= package.version %>/<%= package.name %>.<%= package.version %>.js'
			}
		},

		clean: {
			dist: 'dist'
		},

		jscs: {
			all: {
				options: {
					config: 'config/jscs.json'
				},
				src: [
					'Gruntfile.js',
					'src/**/*.js',
					'test/**/*.js'
				],
				gruntfile: 'Gruntfile.js'
			}
		},

		jshint: {
			all: {
				options: {
					jshintrc: 'config/jshint.json',
					reporter: require('jshint-stylish')
				},
				src: [
					'Gruntfile.js',
					'src/**/*.js',
					'test/**/*.js'
				]
			}
		},

		jsonlint: {
			jscs: {
				src: 'config/jscs.json'
			},
			jshint: {
				src: 'config/jslint.json'
			},
			package: {
				src: 'package.json'
			}
		},

		mochaTest: {
			full: {
				src: [
					'test/*.js',
					'test/*/*.js'
				]
			},
			grid: {
				options: {
					reporter: 'dot'
				},
				src: '<%= mochaTest.full.src %>'
			},
			nyan: {
				options: {
					reporter: 'nyan'
				},
				src: '<%= mochaTest.full.src %>'
			}
		},

		uglify: {
			dist: {
				options: {
					banner: '/**\n * @license\n *\n * <%= package.name %> v<%= package.version %>\n * Generated <%= grunt.template.today("yyyy-mm-dd") %>\n *\n * Copyright (c) <%= grunt.template.today("yyyy") %> BitScoop Labs, Inc.\n * All rights reserved.\n */\n',
					cwd: 'dist'
				},
				files: {
					'dist/<%= package.version %>/<%= package.name %>.<%= package.version %>.min.js': 'dist/<%= package.version %>/<%= package.name %>.<%= package.version %>.js'
				}
			}
		},

		watch: {
			files: 'src/**/*.js',
			tasks: 'build'
		}
	});

	// Load grunt tasks from NPM packages
	require('load-grunt-tasks')(grunt);

	grunt.registerTask('build', [
		'jsonlint:package',
		'lint',
		'mochaTest:grid',
		'buildit',
		'uglify'
	]);

	grunt.registerTask('devel', [
		'buildit'
	]);

	grunt.registerTask('lint', [
		'jsonlint:jshint',
		'jshint',
		'jsonlint:jscs',
		'jscs'
	]);

	grunt.registerTask('test', [
		'mochaTest:full'
	]);

	// Default grunt
	grunt.registerTask('default', [
		'build'
	]);
};
