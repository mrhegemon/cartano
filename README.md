# Cartano
A library for normalizing and modularizing Leaflet-compliant maps.


## Directory Structure
Cartano's directory structure is straightforward. The primary top-level
directories listed along with their use are:

* **artifacts** &ndash; Intermediate build artifacts are stored in this folder.
  The files are all disposable.
* **config** &ndash; External configuration files for libraries such as
  **jshint**, **jscs**, etc. We use this folder to de-clutter the overall
  project directory. We also prefer not to use hidden configuration files in the
  project directory so that it is abundantly clear on any platform where
  configuration files are stored.
* **dist** &ndash; **cartano** is built and minified to this folder. The files
  are all disposable as **cartano** can always be rebuilt from a tagged commit.
* **src** &ndash; Any source files pertinent to the **cartano** build are placed
  in this folder.
* **test** &ndash; Any unit tests or benchmarks pertinent to the built
  **cartano** library.


## Grunt
Cartano uses Grunt for task automation. The Grunt dependencies are maintained in
the `package.json` file. To get up and running with Grunt several steps need to
be taken:
  
  1. Install NodeJS.
  2. Run `sudo npm install -g grunt-cli`
  3. Move into the **cartano** top-level directory.
  4. Run `npm install` to install dependencies listed in the `package.json`
     file.

**Note:** If you're on an OSX system NodeJS may have not been installed with
appropriate permissions. You may be prompted to run `sudo npm install` when
attempting step 4. This shouldn't be necessary and can be resolved by running:

```sudo chown -R `whoami` ~/.npm```

### Single Tasks
There are several single tasks which are actively configured and regularly used.
Each of these tasks may be run independently.

  * **buildit** &ndash; Bundles CommonJS **cartano** code into an AMD-compliant
    bundle.
  * **clean** &ndash; Clears and deletes the "artifacts" and "dist" folders.
  * **devel** &ndash; An alias for **buildit**.
  * **jscs** &ndash; Runs the `jscs` linter on all the source files against the
    required **cartano** coding style.
  * **jshint** &ndash; Runs the `jshint` linter to yield code quality feedback.
  * **jsonlint** &ndash; Typically not run specifically. Checks the required
    JSON configurations for errors.
  * **mochaTest** (or **test**) &ndash; Runs the Mocha tests for the **cartano**
    source files.
  * **test** &ndash; An alias for **mochaTest:full**.
  * **uglify** &ndash; Creates a minified, release-ready "binary" of the
    optimized/built **cartano** module.
  * **watch** &ndash; Initializes the project development mode. Any modified
    source files will trigger the **devel** task while watching is active.


### Compound Tasks
There are a few convenient compound tasks organized into logical sequences which
are regularly used.

  * **build** &ndash; Lints the source files, compiles the source files into an
    AMD-compliat bundle and minifies the result.
  * **lint** &ndash; Runs `jshint` and `jscs` in order.
  * **default** &ndash; The default task (will also be run if no task is
    specified) is simply an alias for **build**.
