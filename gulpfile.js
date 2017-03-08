var fs = require('fs')
    gulp = require('gulp'),
    minify = require('gulp-minify'),
    sourcemaps = require('gulp-sourcemaps'),
    bump = require('gulp-bump'),
    template = require('gulp-template'),
    clean = require('gulp-clean'),
    gutil = require('gulp-util');

function getPackageJson() {
  return JSON.parse(fs.readFileSync('./package.json', 'utf8'));
}

gulp.task('clean', ['bump'], function() {
  var s = gulp.src('app/tmp', {read: false})
    .pipe(clean());
  return s;
});

gulp.task('compress', ['clean'], function() {
  var s = gulp.src('src/*.js')
    .pipe(sourcemaps.init())
      .pipe(minify({
        ext: {
            src:'.js',
            min:'.min.js'
        },
        exclude: ['tasks'],
        preserveComments: 'some',
        ignoreFiles: ['.min.js']
      }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist'))
  return s;
});

gulp.task('version', ['compress'], function() {
  var package = getPackageJson();
  
  gulp.src('dist/*.js')
    .pipe(template({
      version: package.version,
      description: package.description
    }))
    .pipe(gulp.dest('dist'))
});

gulp.task('bump', function(){
  var s = gulp.src('./*.json')
    .pipe(bump())
    .pipe(gulp.dest('./'));
  return s;
});

gulp.task('compile', [ 'version' ]);

