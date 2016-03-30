/**
 * This is a particular panel able to lazy loading a package before being visually activated.
 * After package load it fill itself with the specified package main class.
 *
 * During loading it set a mask with configurable loading text.
 *
 * Before start loading package a beforepackageload will be fired. Return false to block the download.
 *
 * Depending on environment the lazy loading is able to get the package build or the dev classes
 *
 * TODO:
 * - Differentiate between production and testing in case of build
 */
Ext.define('Ibuildings.lazyloading.Panel', {
    extend: 'Ext.panel.Panel',
    xtype: 'lazyloading',

    requires: [
        'Ibuildings.util.Application',
        'Ibuildings.util.Loader'
    ],

    /**
     * @cfg {String} module (required)
     * The package namespace to lazy load when this panel is used for the first time
     */
    module: undefined,

    /**
     * @cfg {String} mainClass
     * The main view class name. When package is loaded this view will be added to this container to fit
     * its content. Alternatively is possible to refer the main view through its xtype using mainXtype.
     * If no mainClass and no mainXtype is specified, automatically the PackageName.view.main.Main will be used.
     * If not provided the package build will be used also in dev mode.
     */
    mainClass: undefined,

    /**
     * @cfg {String} mainXtype
     * The main view class name. When package is loaded this view will be added to this container to fit
     * its content. Alternatively is possible to refer the main view through its xtype using mainXtype.
     * If no mainClass and no mainXtype is specified, automatically the PackageName.view.main.Main will be used.
     */
    mainXtype: undefined,

    /**
     * @cfg {Object} mainConfig
     * A configuration object to be passed to main class constructor
     */
    mainConfig: {},

    /**
     * @cfg {String} loadingText
     * The loading text to display during package download.
     * Default to 'Loading package'.
     */
    loadingText: 'Loading package',

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

    /**
     * @cfg {Boolean} containsCss
     * Set this to true to download also the Package-all.css from resources folder into the package build path
     */
    containsCss: false,

    /**
     * @event beforepackageload
     * Fires before start downloading package. Return false from any listener to stop the download
     * @param {Ibuildings.panel.LazyLoading} panel The Panel object
     * @param {String} module The package name
     * @param {String} mainClass The main class name, if specified
     * @param {String} mainXtype The main xtype name, if specified
     */

    /**
     * @event startpackageload
     * Fires when start downloading package.
     * @param {Ibuildings.panel.LazyLoading} panel The Panel object
     * @param {String} module The package name
     * @param {String} mainClass The main class name, if specified
     * @param {String} mainXtype The main xtype name, if specified
     */

    /**
     * @event endpackageload
     * Fires when start downloading package.
     * @param {Ibuildings.panel.LazyLoading} panel The Panel object
     */

    /**
     * @event errorpackageload
     * Fires when start downloading package.
     * @param {Ibuildings.panel.LazyLoading} panel The Panel object
     */

    initComponent: function(){
        if(!this.module){
            Ext.Error.raise("[LazyLoading Panel] - Module name is mandatory");
        }

        if(!this.mainClass && !this.mainXtype){
            this.mainClass = this.module + '.view.main.Main';
        }

        if(this.mainClass){
            this.isMainClass = true;
        }
        else{
            this.isMainClass = false;
        }

        //Force fit layout because is only a comodity panel
        this.layout = 'fit';

        this.callParent(arguments);

        this.on('beforerender', this.loadPackage, this);
    },

    /**
     * Loading package and show the main view into this panel
     */
    loadPackage: function(){
        //Check if package is already loaded
        try{
            eval(this.module);
        } catch(error){
            //If here continue, namespace does not exists

            //Launch a beforepackageload event, usefull for the user to interrupt the download
            if (this.fireEvent('beforepackageload', this, this.module, this.mainClass, this.mainXtype) === false) {
                return;
            }

            //Launch a startpackageload event
            this.fireEvent('startpackageload', this, this.module, this.mainClass, this.mainXtype);

            if(Ibuildings.util.Application.isBuildEnvironment() || !this.isMainClass){
                this.loadBuild();
            }
            else{
                this.loadDev();
            }
            return;
        }

        //Package exists, simply add the main
        this.addMainPanel();
    },

    loadDev: function(){
        this.setLoading(this.loadingText);

        Ext.Loader.setPath(this.module, this.packagePath + this.module + '/src');

        Ext.require(this.mainClass, function(){
            if(!this.containsCss){
                return this.completeLoad();
            }

            //Load css file
            var stdBuildPath = '../build/production/' + Ibuildings.util.Application.getName() + '/' + this.packageBuildPath;
            this.loadPackageCss(stdBuildPath);
        }, this);
    },

    loadBuild: function(){
        this.setLoading(this.loadingText);
        Ext.Loader.loadScript({
            url: this.packageBuildPath + this.module + '/' + this.module + '.js',
            onLoad: function(){
                if(!this.containsCss){
                    return this.completeLoad();
                }

                //Load css file
                var stdBuildPath = this.packageBuildPath;
                this.loadPackageCss(stdBuildPath);
            },
            onError: function(){
                this.setLoading(false);

                //Launch a endpackageload event
                this.fireEvent('errorpackageload', this);
            },
            scope: this
        });
    },

    loadPackageCss: function(stdBuildPath){
        var packagePath = stdBuildPath + this.module + '/';

        Ibuildings.util.Loader.loadCss({
            url: packagePath + 'resources/' + this.module + '-all.css',
            scope: this,
            onLoad: function(){
                this.completeLoad();
            },
            onError: function(){
                this.setLoading(false);

                //Launch a endpackageload event
                this.fireEvent('errorpackageload', this);
            }
        });
    },

    completeLoad: function() {
        this.setLoading(false);

        //Launch a endpackageload event
        this.fireEvent('endpackageload', this);

        this.addMainPanel();
    },

    addMainPanel: function(){
        var newPanel;
        if(this.isMainClass){
            newPanel = Ext.create(this.mainClass, this.mainConfig);
        }
        else{
            newPanel = Ext.widget(this.mainXtype, this.mainConfig);
        }

        this.add(newPanel);
    }
});