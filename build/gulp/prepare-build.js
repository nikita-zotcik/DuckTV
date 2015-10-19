/**
 * Tasks for internal use
 * Each task called by the main task is listing the tasks that need to be executed as dependencies as an array as the second argument
 * Since tasks run in parallell by default, this can seem confusing at first, but this is what's happening in promise form
 *
 * - buildTemplateCache
 * - concatScripts, concatDeps, concatBackgroundPage, concatStyles, print.css, launch.js, tabTemplate
 * - copyToDeploy
 * - copytab
 * - manifests
 
 */


var gulp = require('gulp'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    concatCss = require('gulp-concat-css'),
    replace = require('gulp-replace'),
    notify = require('gulp-notify'),
    jsonedit = require("gulp-json-editor"),
    fs = require('fs'),
    spawn = require('child_process').spawn;

var ver = String(fs.readFileSync('VERSION')).trim();

/**
 * Minimum app dependencies for background.js
 */
var background = [
    "js/background.js"
];

/**
 * Concat the scripts array into a file named dist/app.js
 */
gulp.task('concatScripts', function() {
    var tab = fs.readFileSync('tab.html').toString();
    var matches = tab.match(/<!-- deploy:replace\=\'(<script.*)\' -->([\s\S]+?[\n]{0,})[^\/deploy:]<!-- \/deploy:replace -->/gm);

    return matches.map(function(match) {
        var targetfile = /<!-- deploy:replace='<script src=\"dist\/(.*.js)\"/g.exec(match)[1];
        var deps = match.match(/(js\/[a-zA-Z0-9\/\.\-]+)/g).map(function(script) {
            if (script.indexOf('.min.js') >= -1) {
                return script;
            } else {
                var mifi = script.replace('.js', '.min.js');
                return fs.existsSync(mifi) ? mifi : script;
            }
        });

        return gulp.src(deps)

        .pipe(concat(targetfile, {
            newLine: ';'
        }))

        .pipe(gulp.dest('dist/'));
    });
});

/**
 * Concat the background page and it's dependencies into dist/background.js
 */
gulp.task('concatBackgroundPage', function() {
    return gulp.src(background)
        .pipe(concat('background.js', {
            newLine: ';'
        }))
        .pipe(gulp.dest('dist/'));
});

/** 
 * Copy launch.js into place
 */
gulp.task('launch.js', function() {
    return gulp.src(['launch.js', 'package.json'])
        .pipe(gulp.dest('dist/'));
});

var templateCache = require('gulp-angular-templatecache');
gulp.task('buildTemplateCache', function() {
    return gulp.src(['templates/*.html', 'templates/**/*.html'])
        .pipe(templateCache({
            module: 'DuckieTV'
        }))
        .pipe(gulp.dest('dist'));
});



/**
 * Parse tab.html and grab the deploy:replace comments sections.
 * Grab the parameter value to those tags, and replace the content with that so that we're left with with just a couple of includes
 */
gulp.task('tabTemplate', ['buildTemplateCache'], function() {
    return gulp.src(['tab.html'])
        .pipe(replace(/<!-- deploy:replace\=\'(.*)\' -->([\s\S]+?)[^\/deploy:]<!-- \/deploy:replace -->/g, '$1'))
        .pipe(replace('</body>', '<script src="dist/templates.js"></script></body>'))
        .pipe(gulp.dest('dist/'));
});

/**
 * Concat the styles.js into dist/style.css
 */
gulp.task('concatStyles', function() {

    var tab = fs.readFileSync('tab.html').toString();
    var matches = tab.match(/<!-- deploy:replace\=\'(<link.*)\' -->([\s\S]+?[\n]{0,})[^\/deploy:]<!-- \/deploy:replace -->/gm);
    var deps = [];
    return matches.map(function(match) {
        var targetfile = /href="dist\/(.*\.css)\"/g.exec(match)[1];


        styles = match.match(/(css\/[a-zA-Z0-9\/\.\-]+)/g)
        console.log(styles);

        return gulp.src(styles)
            .pipe(concatCss(targetfile))
            .pipe(gulp.dest('dist/'));
    });


});

/**
 * Move print.css into place
 */
gulp.task('print.css', function() {
    return gulp.src('css/print.css')
        .pipe(gulp.dest('dist/'));
});

/**
 * Deployment and packaging functions
 */


gulp.task('copyToDeploy', ['concatScripts', 'concatBackgroundPage', 'concatStyles', 'print.css', 'launch.js', 'tabTemplate'], function() {
    if (!fs.existsSync('../deploy/cordova')){
      fs.mkdirSync('../deploy/cordova');
    }
    return gulp.src(['VERSION', 'trakt-trending-500.json', '_locales/**', 'dist/**', 'fonts/**', 'img/**', 'templates/**'], {
            "base": "."
        })
        .pipe(gulp.dest('../deploy/browseraction'))
        .pipe(gulp.dest('../deploy/newtab'))
        .pipe(gulp.dest('../deploy/standalone'))
        .pipe(gulp.dest('../deploy/cordova'));

});

gulp.task('copyCordovaAssets', function() {
    return gulp.src(['build/cordova/**']).pipe(gulp.dest('../deploy/cordova/'));
});

gulp.task('renameLocalesForAndroid', ['copyToDeploy', 'copyCordovaAssets'], function() {

    setTimeout(function() {
    var app = '../deploy/cordova/dist/app.js';
    var src = fs.readFileSync(app);
    fs.writeFileSync(app, String(fs.readFileSync(app)).replace('_locales', 'locales'));

    var dep = '../deploy/cordova/dist/deps.js';
    fs.writeFileSync(dep, String(fs.readFileSync(dep)).replace('_locales/angular-locale_{{locale}}.js', 'locales/angular-locale_{{locale}}.js'));

    var index = '../deploy/cordova/index.html';
    fs.renameSync('../deploy/cordova/dist/tab.html', index);

    src = String(fs.readFileSync(index)).replace('</head>', '<meta name="viewport" content="width=1920,height=1080,target-densitydpi=device-dpi,user-scalable=yes" /></head>');
    fs.writeFileSync(index, src);



    fs.renameSync('../deploy/cordova/_locales', '../deploy/cordova/locales');

    var child = spawn('build/push-cordova.sh', [], {
        cwd: process.cwd()

    });
    child.unref();
    child.stdout.on('data', function(data) {
        console.log(data.toString());
    });
}, 10000);
});

/**
 * Copy the altered tab.html into place
 */
gulp.task('copytab', ['renameLocalesForAndroid'], function() {
    return gulp.src('dist/tab.html')
        .pipe(gulp.dest('../deploy/browseraction'))
        .pipe(gulp.dest('../deploy/newtab'))
        .pipe(gulp.dest('../deploy/standalone'))
        .pipe(gulp.dest('../deploy/cordova'));
});

/**
 * Adjust all 3 versions of manifest.json to use the dist versions of scripts
 * launch.js contains the button attach code for browser-action mode
 * Also updates the manifest to include the latest version defined in the VERSION file
 */
gulp.task('manifests', ['copytab'], function() {

    // js-format formatting options used in manipulating manifest.json
    var formatOptions = {
        'indent_char': '\t',
        'indent_size': 1,
        'brace_style': 'end-expand'
    };

    var noLaunch = function(json) {
        json.version = ver;
        json.background.scripts = ['dist/background.js'];
        return json;
    };

    /**
     * Modify package.json to remove the whole list of background scripts and replace it with dist version and launch.js
     */
    var withLaunch = function(json) {
        json.version = ver;
        json.background.scripts = ['dist/background.js', 'dist/launch.js'];
        return json;
    };

    var nightlyProperties = function(json) {
 	json.version = ver;
        json['user-agent'] = json.window.title = "DuckieTV Standalone " + json.version;
	return json;
    };

    if (process.nightly) {
        console.log('--------------> nightly mode!');
        gulp.src('./_locales/**/messages.json')
            .pipe(jsonedit(function(json) {
                json.appNameNewTab.message += " - Canary";
                json.appShortNameNewTab.message += " - Canary";
                json.appNameBrowserAction.message += " - Canary";
                json.appShortNameBrowserAction.message += " - Canary";
                return json;
            }, formatOptions))
            .pipe(gulp.dest('../deploy/newtab/_locales/'))
            .pipe(gulp.dest('../deploy/browseraction/_locales/'));
    }


    gulp.src('VERSION')
	.pipe(gulp.dest('../deploy/standalone/'))

    if (!process.nightly) {
	gulp.src('package.json')
        .pipe(gulp.dest('../deploy/standalone/'))
    } else {
	gulp.src('package.json')
	.pipe(jsonedit(nightlyProperties,formatOptions))
	.pipe(gulp.dest('../deploy/standalone/'))

	fs.writeFileSync('../deploy/standalone/VERSION', ver);
	
        var j = JSON.parse(fs.readFileSync('build/config.json'));
        j.version = ver;
        fs.writeFileSync('build/config.json', JSON.stringify(j, null, "\t"));
	console.log("Wrote new nightly config.json! ", j);
    }

    gulp.src('manifest.json')
        .pipe(jsonedit(noLaunch, formatOptions))
        .pipe(gulp.dest('../deploy/newtab/'));
    return gulp.src('manifest-app.json')
        .pipe(rename('manifest.json'))
        .pipe(jsonedit(withLaunch, formatOptions))
        .pipe(gulp.dest('../deploy/browseraction/'));
});
