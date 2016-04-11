var _ = require( 'underscore' );
var path = require( 'path' );
var cookieParser = require( 'cookie-parser' );
var express = require( 'express' );
var session = require( 'express-session' );
var favicon = require( 'serve-favicon' );
var routes = require( './server/routes' );
var dataSync = require( './server/helpers/datasync' )();
var Events = require( './server/helpers/events' );
var chat = require( './server/services/chat' )();
var submissionReceiver = require( './server/services/submissionreceiver' )();
var basicAuth = require( 'basic-auth' );

// parse params
var argv = require( 'optimist' )
	.default( {
		reseed: 'false',
		fromsheet: 'false',
		mongolab: 'false'
	} )
	.argv;

// configure app
var app = express();

app.set( 'views', path.join( __dirname, 'server/react' ) );
app.set( 'view engine', 'jsx' );
app.engine( 'jsx', require( 'express-react-views' ).createEngine() );

app.use( cookieParser() );

app.use( session( {
	secret: 'XXX',
	resave: false,
	saveUninitialized: false,
	cookie: {
		maxAge: 60000
	}
} ) );

app.use( '/', express.static( path.join( __dirname, '/public' ) ) );
app.use( '/server', express.static( path.join( __dirname, '/server/assets' ) ) );

var _favicon = favicon( 'public/images/misc/favicon.ico' );
app.use( _favicon );

var auth = function( req, res, next ) {
	function unauthorized( res ) {
		res.set( 'WWW-Authenticate', 'Basic realm=Authorization Required' );
		return res.sendStatus( 401 );
	};

	var user = basicAuth( req );

	if ( !user || !user.name || !user.pass ) {
		return unauthorized( res );
	};

	if ( user.name === 'admin' && user.pass === 'kf6PSCgywYS5rBtN' ) {
		return next();
	} else {
		return unauthorized( res );
	};
};

// client routes
app.get( '/', routes.index );
app.get( '/share/:share_id', routes.share );
app.get( '/data', auth, routes.dataDisplay );
app.get( '/unsupported', routes.unsupported );
app.get( '/notfound', routes.notfound );

// endpoint routes
app.get( '/tweet/:id', routes.tweet ); //http://localhost:3010/tweet/561195366667005952
app.get( '/instagram/:shortcode', routes.instagram ); //http://localhost:3010/instagram/8zLY9zRBqpAoQDsB_ucxRaAzLtT_Uf3NhoUqw0
app.get( '/flickr/:id', routes.flickr ); //http://localhost:3010/flickr/20930686089
app.get( '/soundcloud/:track', routes.soundCloud ); //http://localhost:3010/soundcloud/mylove
app.get( '/youtube/poster/:id', routes.youtubePoster ); //http://localhost:3010/youtube/poster/PfuzjAXfeio
app.get( '/giphy/id/:id', routes.giphy ); //http://localhost:3010/giphy/id/3oEdv0DUQOagqEI30k
app.get( '/giphy/trending/:limit?', routes.giphyTrending ); //http://localhost:3010/giphy/trending/10
app.get( '/giphy/phrase/:phrase/:limit?', routes.giphyPhrase ); //http://localhost:3010/giphy/phrase/burger/10

// error routes
app.get( '*', function( req, res, next ) {
	var err = new Error();
	err.status = 404;
	next( err );
} );


// handling 404 errors
app.use( function( err, req, res, next ) {
	if ( err.status !== 404 ) {
		return next();
	}

	res.status( 404 ).redirect( '/notfound' );
} );


// start listening
var localPort = 3010;
var listeningPort = process.env.PORT || localPort;
var host = process.env.AWS_HOST || require( 'my-local-ip' )();
var port = process.env.AWS_PORT || listeningPort;

var onServerStart = function() {

	GLOBAL.SERVER_URL = 'http://' + host + ( port ? ':' + port : '' );
	GLOBAL.WS_URI = process.env.WS_URI || GLOBAL.SERVER_URL;

	console.log( 'Server started: ' + GLOBAL.SERVER_URL );

	// start DB connection
	var useLocalDB = ( listeningPort === localPort );

	if ( useLocalDB && argv.mongolab === 'true' ) {
		useLocalDB = false;
	}

	var reseed = ( argv.reseed === 'true' );
	var reseedFromSheet = ( reseed && argv.fromsheet === 'true' );

	dataSync.start( useLocalDB, reseed, reseedFromSheet );

	// start io and event handlings
	var io = require( 'socket.io' ).listen( server );

	// init services dependent on socket.io
	submissionReceiver.start( io );
	chat.start( io );
};

var server = app.listen( listeningPort, onServerStart );