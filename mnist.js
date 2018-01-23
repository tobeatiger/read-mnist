var fs = require('fs');
var cheerio = require('cheerio');
var express = require('express');
var app = express();

function getPixelValues() {
    if(!getPixelValues._pixelValues) {
        var dataFileBuffer = fs.readFileSync(__dirname + '/mnist/train-images-idx3-ubyte');
        var labelFileBuffer = fs.readFileSync(__dirname + '/mnist/train-labels-idx1-ubyte');
        getPixelValues._pixelValues = [];
        getPixelValues._imgLabels = [];
        // it would be nice with a checker instead of a hard coded 60000 limit here
        for (var image = 0; image <= 59999; image++) {
            var pixels = [];
            for (var x = 0; x <= 27; x++) {
                for (var y = 0; y <= 27; y++) {
                    pixels.push(dataFileBuffer[(image * 28 * 28) + (y + (x * 28)) + 16]);
                }
            }
            var label = JSON.stringify(labelFileBuffer[image + 8]);
            getPixelValues._imgLabels.push(label);
            getPixelValues._pixelValues.push(pixels);
        }
    }
    return {
        values: getPixelValues._pixelValues,
        labels: getPixelValues._imgLabels
    }
}

function printImg(imgData) {
    var imgStr = '';
    for(var i=0;i<imgData.length;i++) {
        imgStr += (imgData[i] + '    ').substr(0,4);
        if((i+1) % 28 == 0) {
            imgStr += '\n\n';
        }
    }
    return imgStr;
}

function createDivImg(imgData, scale) {
    if(!scale) {
        scale = 1;
    }
    var h = 28 * scale, w = h;
    var $ = cheerio.load('<div class="img" style="height:' + h + 'px;width:' + w + 'px;border:1px solid #ddd;' +
        'display:inline-block;margin-righ:4px;"></div>');
    var v, colorV;
    for(var i=0;i<imgData.length;i++) {
        v = imgData[i];
        // colorV = 255 - v;
        colorV = v;
        $('.img').append('<div style="display:inline-block;width:' + scale + 'px;height:' + scale + 'px;' +
            'background-color:rgb(' + colorV + ',' + colorV + ',' + colorV + ')"></div>');
    }
    return $.html();
}

function getDrawFunc () {
    return 'function draw(canvas, vals, pixelSize) {' +
                'var ctx = canvas.getContext("2d");' +
                'var x=0, y=0;' +
                'var pxVal;' +
                'for(var i=0;i<vals.length;i++) {' +
                    'pxVal = vals[i];' +
                    'ctx.fillStyle = "rgb(" + pxVal + "," + pxVal + "," + pxVal + ")";' +
                    'ctx.fillRect(x,y,pixelSize,pixelSize);' +
                    'x += pixelSize;' +
                    'if((i+1) % 28 == 0) {' +
                        'x = 0;' +
                        'y += pixelSize;' +
                    '}' +
                '}' +
            '}';
}

var imgDataList = getPixelValues();

// 1. print the data of an image
app.get('/printImg/:idx', function (req, res) {
    var idx = parseInt(req.params.idx, 10);
    var imgValues = imgDataList.values[idx];
    res.send('<div style="line-height:28px;">'
        + printImg(imgValues).replace(new RegExp(' ', 'g'), '&nbsp;&nbsp;')
        + '</div>');
});

// 2.1 draw an image with SVG (vanvas)
app.get('/svg/:idx', function(req, res) {
    var idx = parseInt(req.params.idx, 10);
    var imgValues = imgDataList.values[idx];
    var scale = 2;
    var h = 28 * scale, w = h;
    var _id = new Date().getTime();
    var $ = cheerio.load('<canvas class="img" width="' + w + '" height=' + h + '" ' +
        'style="display:inline-block;margin:0 4px 4px 0;" id="' + _id + '"></canvas');
    res.send($.html() +
        '<script>' +
            getDrawFunc() +
            'setTimeout(function () {draw(document.getElementById("' + _id + '"), '
                + JSON.stringify(imgValues) + ', ' + scale + ');}, 50)' +
        '</script>'
    );
});

// 2.2 draw images with SVG (canvas)
app.get('/svgs/:count', function(req, res) {

    var count = parseInt(req.params.count, 10);
    var scale = 1;
    var h = 28 * scale, w = h;
    var _id = new Date().getTime();

    var _res = '';
    for(var i=0;i<count;i++) {
        var $ = cheerio.load('<canvas class="img" width="' + w + '" height="' + h + '" ' +
            'style="display:inline-block;margin:0 4px 4px 0;" id="' + (_id+i) + '"></canvas>');
        _res += $.html();
    }
    _res += '<script>' + getDrawFunc() + 'setTimeout(function () {';
    var imgValues;
    for(var i=0;i<count;i++) {
        imgValues = imgDataList.values[i];
        _res += 'draw(document.getElementById("' + (_id+i) + '"), ' + JSON.stringify(imgValues) + ', ' + scale + ');';
    }
    _res += '}, 50)</script>';

    res.send(_res);
});

// 3.1 draw an image with divs
app.get('/div-img/:idx', function (req, res) {
    var idx = parseInt(req.params.idx, 10);
    var imgValues = imgDataList.values[idx];
    res.send(createDivImg(imgValues, 2));
});

// 3.2 draw images with divs
app.get('/div-imgs/:count', function (req, res) {
    var count = parseInt(req.params.count, 10);
    var imgValues;
    var _res = '';
    for(var i=0;i<count;i++) {
        imgValues = imgDataList.values[i];
        _res += createDivImg(imgValues);
    }
    res.send(_res);
});

app.get('/', function (req, res) {
    res.send('<h1>mnist</h1>');
});

app.listen(3007, function () {
    console.log('Listening on 3007');
})