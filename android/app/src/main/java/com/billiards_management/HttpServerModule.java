package com.billiards_management;

import android.util.Log;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import fi.iki.elonen.NanoHTTPD;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;

public class HttpServerModule extends ReactContextBaseJavaModule {
    private static final String TAG = "HttpServerModule";
    private MyHTTPD server;

    public HttpServerModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "HttpServer";
    }

    @ReactMethod
    public void startServer(String filePath, Promise promise) {
        try {
            if (server == null) {
                server = new MyHTTPD(8000, filePath);
                server.start();
                promise.resolve("http://localhost:8000"+ filePath);

            } else {
                promise.reject("Server already running");
            }
        } catch (IOException e) {
            promise.reject("Failed to start server", e);
        }
    }

    @ReactMethod
    public void stopServer(Promise promise) {
        if (server != null) {
            server.stop();
            server = null;
            promise.resolve("Server stopped");
        } else {
            promise.reject("No server running");
        }
    }

    private static class MyHTTPD extends NanoHTTPD {
        private String filePath;

        public MyHTTPD(int port, String filePath) {
            super(port);
            this.filePath = filePath;
        }

        @Override
        public Response serve(IHTTPSession session) {
            String uri = session.getUri();
    File file = new File(filePath);

    if (!file.exists()) {
        return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "File not found");
    }

    try {
        FileInputStream fis = new FileInputStream(file);
        
        // Determine MIME type
        String mimeType = "application/octet-stream"; // Default for unknown files
        if (filePath.endsWith(".mp4")) {
            mimeType = "video/mp4";
        } else if (filePath.endsWith(".mov")) {
            mimeType = "video/quicktime";
        }

        Response response = newChunkedResponse(Response.Status.OK, mimeType, fis);
        
        // Force download
        response.addHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");
        response.addHeader("Access-Control-Allow-Origin", "*"); // Allow cross-origin requests if needed
        
        return response;
    } catch (IOException e) {
        return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Error serving file");
    }
        }
    }
}
