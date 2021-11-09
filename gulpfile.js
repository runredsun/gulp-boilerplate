const gulp = require('gulp');
const del = require('del');
const concat = require('gulp-concat');
const gulpIf = require('gulp-if');

const pug = require('gulp-pug');
const sass = require('gulp-sass')(require('sass'));
const cleanCss = require('gulp-clean-css');
const plumber = require('gulp-plumber');
const autoprefixer = require('gulp-autoprefixer');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');

const imageMin = require('gulp-imagemin');
const svgSprite = require('gulp-svg-sprite');
const svgmin = require('gulp-svgmin');
const cheerio = require('gulp-cheerio');
const replace = require('gulp-replace');

const browserSync = require('browser-sync').create();

let isBuildFlag = false;

function clean() {
  return del(['./dist']);
}

function pug2html() {
  return gulp
    .src('./src/pug/pages/*.pug')
    .pipe(plumber())
    .pipe(
      pug({
        pretty: true,
      })
    )
    .pipe(plumber.stop())
    .pipe(gulp.dest('./dist'));
}
function fonts() {
  return gulp
    .src('./src/static/fonts/**/*.*')
    .pipe(gulp.dest('./dist/static/fonts'));
}

function scss2css() {
  return gulp
    .src('./src/static/scss/styles.scss')
    .pipe(plumber())
    .pipe(sass().on('error', sass.logError))
    .pipe(
      cleanCss({
        level: 2,
      })
    )
    .pipe(autoprefixer())
    .pipe(plumber.stop())
    .pipe(browserSync.stream())
    .pipe(gulp.dest('dist/static/css/'));
}

function script() {
  return gulp
    .src('src/static/js/main.js')
    .pipe(
      babel({
        presets: ['@babel/env'],
      })
    )
    .pipe(gulpIf(isBuildFlag, uglify()))
    .pipe(browserSync.stream())
    .pipe(gulp.dest('dist/static/js'));
}
function vendors() {
  return gulp
    .src(['./node_modules/svg4everybody/dist/svg4everybody.min.js'])
    .pipe(concat('libs.js'))
    .pipe(gulp.dest('dist/static/js/vendors'));
}

// function jquery() {
//   return gulp
//     .src('./src/static/js/vendors/')
//     .pipe(gulp.dest('dist/static/js/vendors'));
// }

function minImg(params) {
  return gulp
    .src([
      'src/static/images/content/*.{jpg,png,svg,gif}',
      '!src/static/images/sprite/*',
    ])
    .pipe(
      imageMin([
        imageMin.gifsicle({ interlaced: true }),
        imageMin.mozjpeg({ quality: 75, progressive: true }),
        imageMin.optipng({ optimizationLevel: 5 }),
        imageMin.svgo({
          plugins: [{ removeViewBox: true }, { cleanupIDs: false }],
        }),
      ])
    )
    .pipe(gulp.dest('dist/static/images'));
}

function svgSpriteBuild() {
  return (
    gulp
      .src('src/static/images/sprite/*.svg')
      // minify svg
      .pipe(
        svgmin({
          js2svg: {
            pretty: true,
          },
        })
      )
      .pipe(
        cheerio({
          run: function ($) {
            $('[fill]').removeAttr('fill');
            $('[stroke]').removeAttr('stroke');
            $('[style]').removeAttr('style');
          },
          parserOptions: { xmlMode: true },
        })
      )
      .pipe(replace('&gt;', '>'))
      .pipe(
        svgSprite({
          mode: {
            symbol: {
              sprite: 'sprite.svg',
            },
          },
        })
      )
      .pipe(gulp.dest('dist/static/images/sprite'))
  );
}

function mode(isBuild) {
  return (cb) => {
    isBuildFlag = isBuild;
    cb();
  };
}

function serve() {
  browserSync.init({
    server: './dist',
  });
  gulp.watch('./src/pug/**/*.pug', pug2html);
  gulp.watch('./src/static/js/main.js', script);
  gulp.watch('./src/static/images/content/*.{jpg,png,svg,gif}', minImg);
  gulp.watch('src/static/scss/**/*.scss', scss2css);
  gulp.watch('./dist/*.html').on('change', browserSync.reload);
}

const dev = gulp.parallel(
  scss2css,
  pug2html,
  minImg,
  vendors,
  svgSpriteBuild,
  script
);

exports.default = gulp.series(clean, dev, serve);
exports.build = gulp.series(clean, mode(true), dev);
