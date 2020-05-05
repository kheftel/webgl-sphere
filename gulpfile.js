var gulp = require('gulp');
var browserSync = require('browser-sync').create()
var ts = require('gulp-typescript');

gulp.task('watch', function () {
    browserSync.reload();
});

gulp.task('default', function () {
    browserSync.init({
        server: true
    });

    gulp.watch('js/index.js', ['watch']);
    gulp.watch('index.html', ['watch']);
    gulp.watch('css/style.css', ['watch']);
});
