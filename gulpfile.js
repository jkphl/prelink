/* eslint-disable import/no-extraneous-dependencies */

/**
 * prelink is a general purpose polyfill for preloading & prefetching <link> elements
 *
 * @see https://github.com/jkphl/prelink
 *
 * @author Joschi Kuphal <joschi@kuphal.net> (https://github.com/jkphl)
 * @copyright © 2019 Joschi Kuphal
 * @license MIT https://raw.github.com/jkphl/prelink/master/LICENSE
 */

const gulp = require('gulp');
const rename = require('gulp-rename');
const typescript = require('gulp-typescript');
const uglify = require('gulp-uglify');

gulp.task('default', (done) => {
    gulp.src(['index.js'])

    // Compile JavaScript
        .pipe(typescript({ target: 'ES3', allowJs: true }))

        // Rename to prelink.js
        .pipe(rename(path => path.basename = 'prelink'))

        // Write the files to their destination
        .pipe(gulp.dest('./build'))

        // Minify
        .pipe(uglify())

        // Rename to prelink.js
        .pipe(rename(path => path.basename = 'prelink.min'))

        // Write the files to their destination
        .pipe(gulp.dest('./build'));
    done()
});

gulp.task('watch', () => {
    gulp.watch(['index.js'], gulp.series('default'));
});
