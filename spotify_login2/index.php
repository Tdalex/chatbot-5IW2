<?php
require 'vendor/autoload.php';

$session = new SpotifyWebAPI\Session(
    '90bf77f8b53749faa5a3902f9827b333',
    'db2a341beff945c480f9066b6549ec9f',
    'http://localhost/spotify_login2/'
);

$api = new SpotifyWebAPI\SpotifyWebAPI();

if (isset($_GET['code'])) {
    $session->requestAccessToken($_GET['code']);
    $api->setAccessToken($session->getAccessToken());



} else {
    $options = [
        'scope' => [
            'user-read-email',
            "playlist-modify-public",
            "playlist-modify-private",
            "playlist-read-private"
        ],
    ];

    header('Location: ' . $session->getAuthorizeUrl($options));
    die();
}

?>
<!DOCTYPE html>

<body>
<div class="container">
    <?php print_r($session->getAccessToken()); ?>
</div>
<!--<script src="js/main.js"></script>-->
</body>