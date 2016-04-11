var _ = require( 'underscore' );
var url = require( 'url' );
var dataSync = require( './helpers/datasync' )();
var tweet = require( './services/tweet' )();
var instagram = require( './services/instagram' )();
var flickr = require( './services/flickr' )();
var soundCloud = require( './services/soundcloud' )();
var giphy = require( './services/giphy' )();
var youTube = require( './services/youtube' )();

var UAParser = require( 'ua-parser-js' );
var uaParser = new UAParser();

var MobileDetect = require( 'mobile-detect' );
var spiderDetector = require( 'spider-detector' );


function getDefaultSharingInfo() {

	return {
		title: 'XXX',
		url: 'XXX',
		description: 'XXX',
		image: 'XXX'
	};
};

function ensureSupportedBrowser( req ) {

	var ua = req.headers[ 'user-agent' ];
	var browserName = uaParser.setUA( ua ).getBrowser().name;
	var fullBrowserVersion = uaParser.setUA( ua ).getBrowser().version;
	var browserVersion = fullBrowserVersion.split( '.', 1 ).toString();
	var browserVersionNumber = Number( browserVersion );

	if ( browserName == 'IE' && browserVersion <= 9 ) {

		return false;

	} else if ( browserName == 'Firefox' && browserVersion <= 24 ) {

		return false;

	} else if ( browserName == 'Chrome' && browserVersion <= 29 ) {

		return false;

	} else if ( browserName == 'Canary' && browserVersion <= 32 ) {

		return false;

	} else if ( browserName == 'Safari' && browserVersion <= 5 ) {

		return false;

	} else if ( browserName == 'Opera' && browserVersion <= 16 ) {

		return false;
	}

	return true;
};

function getBrowserName( req ) {

	var ua = req.headers[ 'user-agent' ];
	var browserName = uaParser.setUA( ua ).getBrowser().name;

	return browserName;
};

// client routes
exports.index = function( req, res ) {

	var isSpider = spiderDetector.isSpider( req.headers[ 'user-agent' ] );

	if ( !isSpider ) {
		if ( !ensureSupportedBrowser( req ) ) {
			res.redirect( '/unsupported' );
			return;
		}
	}

	//console.log( "Hit Index!" );
	var p1 = dataSync.getSortedSubmissionsByTypeFromDB( 'image', 0, 30, function( docs ) {
		return docs;
	} );

	var p2 = dataSync.getSortedSubmissionsByTypeFromDB( 'giphy', 0, 30, function( docs ) {
		return docs;
	} );

	var p3 = dataSync.getSortedSubmissionsByTypeFromDB( 'video', 0, 30, function( docs ) {
		return docs;
	} );

	var p4 = dataSync.getSortedSubmissionsByTypeFromDB( 'text', 0, 30, function( docs ) {
		return docs;
	} );

	var p5 = dataSync.getSortedSubmissionsByTypeFromDB( 'tweet', 0, 30, function( docs ) {
		return docs;
	} );

	var p6 = dataSync.getSortedSubmissionsByTypeFromDB( 'sound', 0, 10, function( docs ) {
		return docs;
	} );

	var p7 = dataSync.getChatHistoryFromDB( 20, function( docs ) {
		return docs;
	} );

	Promise.all( [ p1, p2, p3, p4, p5, p6, p7 ] ).then( function( values ) {

		var sharedSubmissionInfo = req.session.sharedSubmissionInfo;
		req.session.sharedSubmissionInfo = null;

		var props = {
			sharingInfo: getDefaultSharingInfo(),
			imageSubmissions: values[ 0 ],
			giphySubmissions: values[ 1 ],
			videoSubmissions: values[ 2 ],
			textSubmissions: values[ 3 ],
			tweetSubmissions: values[ 4 ],
			soundSubmissions: values[ 5 ],
			chatHistory: values[ 6 ],
			sharedSubmission: sharedSubmissionInfo
		};

		if ( !isSpider ) {

			var mobileDetect = new MobileDetect( req.headers[ 'user-agent' ] );
			props.mobile = mobileDetect.mobile();
			props.phone = mobileDetect.phone();
			props.tablet = mobileDetect.tablet();

			var query = url.parse( req.url, true ).query;

			if ( query.debug === 'true' ) {
				props.debug = true;
			}

			if ( query.usegl === 'true' ) {
				props.usegl = true;
			}

			if ( query.usegl === 'false' ||
				props.mobile ||
				getBrowserName( req ) === 'IE' ||
				getBrowserName( req ) === 'Firefox' ) {

				props.usegl = false;
			}

			if ( getBrowserName( req ) === 'IE' ) {
				props.ie = true;
			}

			if ( getBrowserName( req ) === 'Firefox' ) {
				props.ff = true;
			}
		}

		res.render( 'index', props );
	} );
};


exports.share = function( req, res ) {

	// retrieve sharing info from database, and store in user's session
	// for retrieval after redirecting
	dataSync.getSubmissionByIdFromDB( req.params.share_id, function( doc ) {

		// successfully found submission of this id
		var id = doc._id;

		var sharedSubmissionInfo = {
			id: id,
			title: 'XXX - ' + id,
			type: doc.type,
			content: doc.content,
			url: GLOBAL.SERVER_URL + '/share/' + id,
			redirectUrl: GLOBAL.SERVER_URL + '/#/share/' + id,
			description: 'This is the specific share text.',
			image: 'XXX'
		};

		req.session.sharedSubmissionInfo = sharedSubmissionInfo;

		res.render( 'share', {
			sharingInfo: sharedSubmissionInfo
		} );

	}, function( err ) {

		// failed to find the submission
		// currently redirect back to home
		res.redirect( '/' );
	} );
};


exports.dataDisplay = function( req, res ) {

	var p1 = dataSync.getSubmissionsFromDB();

	var p2 = dataSync.getChatHistoryFromDB();

	Promise.all( [ p1, p2 ] ).then( function( values ) {

		res.render( 'datadisplay', {
			sharingInfo: {},
			submissions: values[ 0 ],
			chatHistory: values[ 1 ]
		} );
	} );
};


exports.unsupported = function( req, res ) {

	var mobileDetect = new MobileDetect( req.headers[ 'user-agent' ] );

	res.render( 'unsupported', {
		sharingInfo: {},
		mobile: mobileDetect.mobile(),
		phone: mobileDetect.phone(),
		tablet: mobileDetect.tablet()
	} );
};


exports.notfound = function( req, res ) {

	var mobileDetect = new MobileDetect( req.headers[ 'user-agent' ] );

	res.render( '404', {
		sharingInfo: {},
		mobile: mobileDetect.mobile(),
		phone: mobileDetect.phone(),
		tablet: mobileDetect.tablet()
	} );
};


// API end points
exports.tweet = function( req, res ) {

	console.log( 'Hit endpoint for Tweet id: %s', req.params.id );

	tweet.getTweetById( req.params.id, function( err, data ) {

		res.header( 'Access-Control-Allow-Origin', '*' );

		if ( err ) {

			res.sendStatus( err[ 'statusCode' ] );

		} else {

			res.json( data );
		}
	} );
};


exports.instagram = function( req, res ) {

	console.log( 'Hit endpoint for Instagram shortcode: %s', req.params.shortcode );

	instagram.getImageByShortcode( req.params.shortcode, function( err, imageData ) {

		res.header( 'Access-Control-Allow-Origin', '*' );

		if ( err ) {

			res.sendStatus( err );

		} else {

			res.json( imageData );
		}
	} );
};


exports.flickr = function( req, res ) {

	console.log( 'Hit endpoint for Flickr id: %s', req.params.id );

	flickr.getImageById( req.params.id, function( err, imageData ) {

		res.header( 'Access-Control-Allow-Origin', '*' );

		if ( err ) {

			res.sendStatus( err );

		} else {

			res.json( imageData );
		}
	} );
};


exports.soundCloud = function( req, res ) {

	console.log( 'Hit endpoint for SoundCloud track: %s', req.params.track );

	soundCloud.getTrack( req.params.track, function( err, trackData ) {

		res.header( 'Access-Control-Allow-Origin', '*' );

		if ( err || !trackData[ 'streamable' ] ) {

			res.sendStatus( 404 );

		} else {

			res.json( trackData );
		}
	} );
};


exports.giphy = function( req, res ) {

	console.log( 'Hit endpoint for Giphy id: %s', req.params.id );

	giphy.getById( req.params.id, function( err, data ) {

		res.header( 'Access-Control-Allow-Origin', '*' );

		if ( err ) {

			res.sendStatus( err );

		} else {

			res.json( data );
		}
	} );
};


exports.giphyTrending = function( req, res ) {

	console.log( 'Hit endpoint for Giphy trending' );

	giphy.getTrending( req.params.limit, function( err, data ) {

		res.header( 'Access-Control-Allow-Origin', '*' );

		if ( err ) {

			res.sendStatus( err );

		} else {

			res.json( data );
		}
	} );
};


exports.giphyPhrase = function( req, res ) {

	console.log( 'Hit endpoint for Giphy phrase: %s', req.params.phrase );

	giphy.getFromPhrase( req.params.phrase, req.params.limit, function( err, data ) {

		res.header( 'Access-Control-Allow-Origin', '*' );

		if ( err ) {

			res.sendStatus( err );

		} else {

			res.json( data );
		}
	} );
};


exports.youtubePoster = function( req, res ) {

	console.log( 'Hit endpoint for YouTube poster: %s', req.params.id );

	youTube.getPosterById( req.params.id, function( err, data ) {

		res.header( 'Access-Control-Allow-Origin', '*' );

		if ( err ) {

			res.sendStatus( err );

		} else if ( !data ) {

			res.sendStatus( 404 );

		} else {

			res.end( data );
		}
	} );
};