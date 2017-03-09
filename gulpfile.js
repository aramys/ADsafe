var fs = require('fs')
    gulp = require('gulp'),
    minify = require('gulp-minify'),
    sourcemaps = require('gulp-sourcemaps'),
    bump = require('gulp-bump'),
    template = require('gulp-template'),
    gutil = require('gulp-util'),
    del = require('del');

function getPackageJson() {
  return JSON.parse(fs.readFileSync('./package.json', 'utf8'));
}

/** Build Steps **/
gulp.task('clean:build', function() {
  return del(['dist', 'build']);
});

gulp.task('compress:build', ['clean:build'], function() {
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
    .pipe(gulp.dest('build'))
  return s;
});

/** Compile Steps **/
gulp.task('clean:compile', ['bump'], function() {
  return del(['dist', 'build']);
});

gulp.task('compress:compile', ['clean:compile'], function() {
  var s = gulp.src('src/*.js')
    .pipe(minify({
      ext: {
          src:'.js',
          min:'.min.js'
      },
      exclude: ['tasks'],
      preserveComments: 'some',
      ignoreFiles: ['.min.js']
    }))
    .pipe(gulp.dest('dist'))
  return s;
});

gulp.task('version', ['compress:compile'], function() {
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

gulp.task('default', [ 'compress:build' ])
