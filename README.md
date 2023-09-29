# Control Streams with REST API

# How to use?
1. Start the server with `node index.js`
2. Open the postman and add a websocket request with the following url: `ws://localhost:3000`, which returns a token.
3. Download and import the [postman collection]('./Stream.postman_collection.json') to postman.
4. Make a `POST` request to `stream/cpu/create?token{token}` to create a stream, which returns a stream id.
5. To start the stream, make a `POST` request to `stream/{stream_id}/start?token={token}`.
6. To stop the stream, make a `POST` request to `stream/{stream_id}/stop?token={token}`.
7. To delete the stream, make a `DELETE` request to `stream/{stream_id}/delete?token={token}`.
