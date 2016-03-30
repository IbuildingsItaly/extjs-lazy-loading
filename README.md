# ExtJs Package Lazy Loading

### Overview

This repo contains two classes that are able to handling package lazy loading in ExtJs

### Ibuildings.lazyloading.Loader

This is a singleton class that, if required as top class in the Application.js, is able to get in the middle between bootstrap and Application.

With this class enabled you can specify required packages in two different ways:

Static

	/**
     * An array of packages object. Any package must contains
     * - name: The package name
     * - packagePath: Default to '../packages/local/'
     * - packageBuildPath: Default to '../'
     * - containsCss: Default to false
     * - requires: An array of package required classes. Tipically just the main that internally requires the other.
     *              This is used only in dev mode.
     */
    packages: [{
        name: 'Financial',
        containsCss: true,
        requires: [
            'Financial.view.widget.Chart'
        ]
    }]
   
Dynamic

	/**
     * If implemented this function must return an array ok packages to load.
     * This array will be merged with the content of packages array.
     * Through this function is possible to dynamically load packages depending on some variable in localstorage or
     * query string
     */
    loadPackages: function(){
        var qs = Ext.Object.fromQueryString(location.search.substr(1));
        if(!qs.cust){
            qs.cust = "Ibuildings"
        }

        return [{
            name: 'Customer' + qs.cust,
            requires: [
                'Customer' + qs.cust + '.view.contact.Form'
            ]
        }];
    }
    
These packages will be downloaded as separate js file before the application start.

This approach permit you to:

- Dynamically determine which packages are required, for example depending on application privileges
- Invalidate only the package cache on update, instead of the whole application
- Download different code for different users, without changing the application code

### Ibuildings.lazyloading.Panel

This is an ExtJs panel widget that is able to download a package only when is visually activated and put the package main class into itself.

This is very useful because permit the application to startup getting only the core code and dynamically add needed part.

Use is very simple:

	{
        xtype: 'lazyloading',

        title: 'Administration',
        iconCls: 'fa-cog',

        module: 'Administration',
        mainClass: 'Administration.view.project.List',

        containsCss: true
    }