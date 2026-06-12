"use strict";
    
main.consumes = ["Plugin", "connect.static"];
main.provides = ["c9.static.plugins"];
module.exports = main;

function main(options, imports, register) {
    var Plugin = imports.Plugin;
    var statics = imports["connect.static"];
    var fs = require("fs");
    
    var whitelist = options.whitelist;
    var blacklist = options.blacklist;
    var externalPlugins = options.externalPlugins || [];
    
    /***** Initialization *****/
    
    var plugin = new Plugin("Ajax.org", main.consumes);
    
    var loaded = false;
    function load() {
        if (loaded) return false;
        loaded = true;
        
        var requirePaths = {
            ace: "lib/ace/lib/ace",
            ace_tree: "lib/ace_tree/lib/ace_tree",
            treehugger: "lib/treehugger/lib/treehugger",
            acorn: "lib/treehugger/lib/acorn",
            jsonm: "lib/jsonm",
            tern: "lib/tern",
            tern_from_ts: "lib/tern_from_ts",
            ui: "lib/ui",
            c9: "lib/c9",
            frontdoor: "lib/frontdoor",
            outplan: "lib/outplan/dist/outplan",
        };
        
        [
            "acorn",
            "tern",
            "tern_from_ts",
            "treehugger",
            "jsonm",
            "pivottable",
            "architect",
            "source-map",
            "rusha",
            "c9",
            "ui",
            "emmet",
            "frontdoor",
            "outplan",
            "mocha", // TESTING
            "chai",  // TESTING
        ].forEach(function(name) {
            statics.addStatics([{
                path: __dirname + "/../../node_modules/" + name,
                mount: "/lib/" + name
            }]);
        });
        
        statics.addStatics([{
            path: __dirname + "/../node_modules/ace_tree",
            mount: "/lib/ace_tree",
        }]);
        
        statics.addStatics([{
            path: __dirname + "/../node_modules/ace",
            mount: "/lib/ace",
            rjs: requirePaths
        }]);

        statics.addStatics(externalPlugins.map(function(plugin) {
            if (typeof plugin == "string")
                plugin = { path: plugin, mount: plugin };
            return {
                path: __dirname + "/../../node_modules/" + plugin.path,
                mount: "/plugins/" + plugin.mount
            };
        }));
        
        try {
            statics.addStatics(
                fs.readdirSync(__dirname + "/../../user-plugins/").map(function(plugin) {
                    if (/^scripts$|\.(json|sh)$/.test(plugin)) 
                        return;
                    return {
                        path: __dirname + "/../../user-plugins/" + plugin,
                        mount: "/plugins/" + plugin
                    };
                }).filter(Boolean)
            );
        } catch (e) {
        }
        
        statics.addStatics(fs.readdirSync(__dirname + "/../")
            .filter(function(path) {
                if (path in blacklist)
                    return false;
                else if (path in whitelist)
                    return true;
                else if (path.indexOf("c9.ide.") === 0)
                    return true;
                else if (path.indexOf("c9.account") === 0)
                    return true;
                else
                    return false;
            })
            .map(function(path) {
               return {
                    path: __dirname + "/../../plugins/" + path,
                    mount: "/plugins/" + path
                };
            })
        );
        
        
        statics.addStatics([{
            path: __dirname + "/../../configs/ide",
            mount: "/configs/ide"
        }]);
        
        statics.addStatics([{
            path: __dirname + "/www",
            mount: "/"
        }]);
        
        statics.addStatics([{
            path: __dirname + "/../../docs",
            mount: "/docs"
        }]);

        // Also serve static files under sub-path for reverse proxy scenarios (C9_SUB_PATH)
        var subPath = (options.subPath || "").replace(/^\/+|\/+$/g, "");
        if (subPath) {
            var subMount = "/" + subPath;
            
            // Sub-path mount for www (IDE HTML files)
            statics.addStatics([{
                path: __dirname + "/www",
                mount: subMount
            }]);
            
            // Sub-path mounts for docs, configs/ide
            statics.addStatics([{
                path: __dirname + "/../../docs",
                mount: subMount + "/docs"
            }]);
            
            statics.addStatics([{
                path: __dirname + "/../../configs/ide",
                mount: subMount + "/configs/ide"
            }]);
            
            // Sub-path mounts for external plugins
            statics.addStatics(externalPlugins.map(function(plugin) {
                if (typeof plugin == "string")
                    plugin = { path: plugin, mount: plugin };
                return {
                    path: __dirname + "/../../node_modules/" + plugin.path,
                    mount: subMount + "/plugins/" + plugin.mount
                };
            }));
            
            // Sub-path mount for user-plugins
            try {
                statics.addStatics(
                    fs.readdirSync(__dirname + "/../../user-plugins/").map(function(plugin) {
                        if (/^scripts$|\.(json|sh)$/.test(plugin)) 
                            return;
                        return {
                            path: __dirname + "/../../user-plugins/" + plugin,
                            mount: subMount + "/plugins/" + plugin
                        };
                    }).filter(Boolean)
                );
            } catch (e) {
            }
            
            // Sub-path mounts for core plugins
            statics.addStatics(fs.readdirSync(__dirname + "/../")
                .filter(function(path) {
                    if (path in blacklist)
                        return false;
                    else if (path in whitelist)
                        return true;
                    else if (path.indexOf("c9.ide.") === 0)
                        return true;
                    else if (path.indexOf("c9.account") === 0)
                        return true;
                    else
                        return false;
                })
                .map(function(path) {
                   return {
                        path: __dirname + "/../../plugins/" + path,
                        mount: subMount + "/plugins/" + path
                    };
                })
            );
            
            // Sub-path mounts for lib packages (from node_modules)
            [
                "acorn", "tern", "tern_from_ts", "treehugger", "jsonm",
                "pivottable", "architect", "source-map", "rusha", "c9",
                "ui", "emmet", "frontdoor", "outplan", "mocha", "chai"
            ].forEach(function(name) {
                statics.addStatics([{
                    path: __dirname + "/../../node_modules/" + name,
                    mount: subMount + "/lib/" + name
                }]);
            });
            
            // Sub-path mount for ace_tree and ace from plugin's node_modules
            statics.addStatics([{
                path: __dirname + "/../node_modules/ace_tree",
                mount: subMount + "/lib/ace_tree",
            }]);
            
            statics.addStatics([{
                path: __dirname + "/../node_modules/ace",
                mount: subMount + "/lib/ace",
            }]);
        }

    }
    
    /***** Lifecycle *****/
    
    plugin.on("load", function() {
        load();
    });
    plugin.on("unload", function() {
        loaded = false;
    });
    
    /***** Register and define API *****/
    
    plugin.freezePublicAPI({});
    
    register(null, {
        "c9.static.plugins": plugin
    });
}