/**
 * This is a singleton class the works in the middle between bootstrap and Application.
 *
 * If required as first class in the application is able to read Application packages configuration
 * and load them from dedicated build file before application startup.
 */
Ext.define('Ibuildings.lazyloading.Loader', {
    singleton: true,

    requires: [
        'Ibuildings.util.Application',
        'Ibuildings.util.Loader',
        'Ibuildings.semaphore.Barrier'
    ],

    /**
     * @cfg {String} packagePath
     * The package path related to the index page, including trailing slash.
     * Default to '../packages/local/'.
     */
    packagePath: '../packages/local/',

    /**
     * @cfg {String} packageBuildPath
     * The package build path related to the index page, including trailing slash.
     * Default to '../'.
     */
    packageBuildPath: '../',

    constructor: function(){
        Ext.onReady(this.loadPackages, this);
    },

    loadPackages: function(){
        var ibLoad = this;
        var appNamespace = Ibuildings.util.Application.getNamespace();
        if(!appNamespace || !appNamespace.Application){
            return;
        }

        var appNameString = Ibuildings.util.Application.getName();

        /**
         * Override the Application class due to launching application only when all the needed packages are ready.
         * For the user nothing change.
         */
        var overrideConfig = {
            override: appNameString + '.Application',

            packagesReady: false,

            onProfilesReady: function(){
                if(this.packagesReady){
                    this.callParent(arguments);
                }
                else{
                    Ext.on('packagesready', function(){
                        this.packagesReady = true;
                        this.onProfilesReady();
                    }, this);

                    this.doLoadPackages();
                }
            },

            doLoadPackages: function(){
                var pkgs = this.packages || [];
                if(this.loadPackages && Ext.isFunction(this.loadPackages)){
                    var extraPackages = this.loadPackages();
                    if(Ext.isArray(extraPackages)){
                        pkgs = Ext.Array.merge(pkgs, extraPackages);
                    }
                }

                //If there are no packages to load, simply continue execution
                if(pkgs.length === 0){
                    Ext.GlobalEvents.fireEvent('packagesready');
                    return;
                }

                //Load all packages async
                var barrier = Ext.create('Ibuildings.semaphore.Barrier', {
                    quantity: pkgs.length,
                    callback: function(){
                        Ext.GlobalEvents.fireEvent('packagesready');
                    },
                    scope: this
                });

                Ext.each(pkgs, function(pkg){
                    pkg.packageBuildPath = pkg.packageBuildPath || ibLoad.packageBuildPath;
                    pkg.packagePath = pkg.packagePath || ibLoad.packagePath;
                    pkg.containsCss = pkg.containsCss || false;

                    if(Ibuildings.util.Application.isBuildEnvironment()){
                        ibLoad.loadBuild(pkg, function(){
                            //Check if need to load a css
                            if(!pkg.containsCss){
                                return barrier.reach();
                            }

                            var stdBuildPath = pkg.packageBuildPath;
                            ibLoad.loadPackageCss(stdBuildPath, pkg, function(){
                                barrier.reach();
                            }, this);
                        }, this);
                    }
                    else{
                        ibLoad.loadDev(pkg, function(){
                            //Check if need to load a css
                            if(!pkg.containsCss){
                                return barrier.reach();
                            }

                            var stdBuildPath = '../build/production/' + appNameString + '/' + pkg.packageBuildPath;
                            ibLoad.loadPackageCss(stdBuildPath, pkg, function(){
                                barrier.reach();
                            }, this);
                        }, this);
                    }
                }, this);
            }
        };
        Ext.define('Ibuildings.override.Application', overrideConfig);
    },

    /**
     * Load a package in dev mode, basically setup the path for the loader
     * @param {Object} pkg The package defined object
     * @param {Function} callback The callback to be executed on load
     * @param {Object} scope The scope for the callbck
     */
    loadDev: function(pkg, callback, scope){
        callback = callback || Ext.emptyFn;
        scope = scope || this;

        Ext.Loader.setPath(pkg.name, pkg.packagePath + pkg.name + '/src');

        //Dynamically require all the given classes
        pkg.requires = pkg.requires || [];

        if(pkg.requires.length === 0){
            return callback.call(scope);
        }

        var barrier = Ext.create('Ibuildings.semaphore.Barrier', {
            quantity: pkg.requires.length,
            callback: function(){
                callback.call(scope);
            },
            scope: this
        });

        Ext.each(pkg.requires, function(reqCls){
            Ext.require(reqCls, function(){
                barrier.reach();
            }, this);
        });
    },

    /**
     * Load the package for build mode. Download the Package.js
     * @param {Object} pkg The package defined object
     * @param {Function} callback The callback to be executed on load
     * @param {Object} scope The scope for the callbck
     */
    loadBuild: function(pkg, callback, scope){
        callback = callback || Ext.emptyFn;
        scope = scope || this;

        Ext.Loader.loadScript({
            url: pkg.packageBuildPath + pkg.name + '/' + pkg.name + '.js',
            onLoad: function(){
                callback.call(scope);
            },
            onError: function(){
                Ext.Error.raise('[LazyLoading Loader] - Package load error: ' + pkg.name);
            },
            scope: this
        });
    },

    /**
     * Load the package for build mode. Download the Package.js
     * @param {String} stdBuildPath The css path calculated depending on build type
     * @param {Object} pkg The package defined object
     * @param {Function} callback The callback to be executed on load
     * @param {Object} scope The scope for the callbck
     */
    loadPackageCss: function(stdBuildPath, pkg, callback, scope){
        var packagePath = stdBuildPath + pkg.name + '/';
        callback = callback || Ext.emptyFn;
        scope = scope || this;

        Ibuildings.util.Loader.loadCss({
            url: packagePath + 'resources/' + pkg.name + '-all.css',
            scope: this,
            onLoad: function(){
                callback.call(scope);
            },
            onError: function(){
                Ext.Error.raise('[LazyLoading Loader] - Package load error: ' + pkg.name);
            }
        });
    }
});