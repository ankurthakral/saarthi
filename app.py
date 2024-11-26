from flask import (
    Flask,
    render_template,
    request,
    jsonify,
)
from gradio_client import Client
import requests
import re

# load_dotenv()

app = Flask(__name__)
app.static_folder = "static"


# CORS(app, origins=[os.getenv("CORS_ORIGIN_LOCAL"), "http://localhost:3000"])

# client = Client("http://localhost:8001/?")


try:
    client = Client("http://localhost:8001/?")
except Exception as e:
    print(f"Error initializing Gradio client: {e}")


# mygpt api code


@app.route("/")
def mygpt():
    return render_template("saarthi.html")


@app.route("/privategpt")
def privategpt():
    return render_template("private-gpt.html")


@app.route("/api/set_mode", methods=["POST"])
def set_mode():
    data = request.get_json()
    mode = data.get("mode")

    try:
        # Pass 'mode' as a list and use the correct client reference
        result = client.predict(
            [mode], api_name="/_set_current_mode"
        )  # Make sure `client` is lowercase
        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# @app.route("/api/set_mode", methods=["POST"])
# def set_mode():
#     data = request.get_json()
#     mode = data.get("mode")

#     try:
#         result = Client.predict(mode, api_name="/_set_current_mode")
#         return jsonify({"success": True, "result": result})
#     except Exception as e:
#         return jsonify({"success": False, "error": str(e)}), 500


# API Chat working


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    message = data.get("message")
    mode = data.get("mode", "chat")
    files = data.get("files", [])
    system_prompt = data.get("system_prompt", "Hello!!")

    reqUrl = "http://localhost:8001/v1/completions"
    headersList = {"Content-Type": "application/json", "Accept": "application/json"}

    use_context = False
    context_filter = None
    if mode in ["query", "search"]:
        use_context = True
        context_filter = files

    payload = {
        "include_sources": True,
        "prompt": message,
        "stream": False,
        "system_prompt": system_prompt,
        "use_context": use_context,
    }

    if context_filter:
        payload["context_filter"] = context_filter

    try:
        response = requests.request("POST", reqUrl, json=payload, headers=headersList)
        response_data = response.json()

        # Extract the content and sources from the response
        content = response_data["choices"][0]["message"]["content"]
        sources = response_data["choices"][0].get("sources", [])

        # Format the sources if they exist
        if sources:
            formatted_sources = []
            for source in sources:
                doc_metadata = source["document"]["doc_metadata"]
                doc_text = source["text"]
                formatted_sources.append(
                    {
                        "source_text": doc_text,
                        "file_name": doc_metadata["file_name"],
                        "page_label": doc_metadata.get("page_label", "N/A"),
                    }
                )

            # Attach sources to the response
            print("------------------------------------------------")
            print(content)
            print(formatted_sources[1]["file_name"])
            print(formatted_sources[1]["page_label"])
            print("------------------------------------------------")
            return jsonify(
                {
                    "reply": content,
                    "file_name": formatted_sources[1]["file_name"],
                    "page_label": formatted_sources[1]["page_label"],
                }
            )

        # Return response without sources if none exist
        return jsonify({"reply": content})

    except Exception as e:
        app.logger.error("Chat error: %s", str(e))
        return jsonify({"error": str(e)}), 500


@app.route("/api/list_ingested_files", methods=["GET"])
def list_ingested_files():
    try:
        reqUrl = "http://localhost/v1/ingest/list"
        headersList = {"Accept": "application/json"}

        response = requests.get(reqUrl, headers=headersList)
        response = response.json()
        print(response)

        # Ensure that the response has a 'data' key
        if "data" in response:
            return jsonify({"success": True, "data": response["data"]})

        else:
            return (
                jsonify({"success": False, "error": "No data found in response"}),
                500,
            )

    except Exception as e:
        app.logger.error("List ingested files error: %s", str(e))
        return jsonify({"error": str(e)}), 500


# @app.route("/api/list_ingested_files", methods=["GET"])
# def list_ingested_files():
#     try:
#         result = client.predict(api_name="/_list_ingested_files")
#         return jsonify({"success": True, "result": result})
#     except Exception as e:
#         return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/upload", methods=["POST"])
def ingest_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if file:
        try:
            reqUrl = "http://localhost/v1/ingest/file"
            files = {"file": (file.filename, file.stream, file.content_type)}
            headersList = {"Accept": "application/json"}

            response = requests.post(reqUrl, files=files, headers=headersList)
            response = response.json()

            return jsonify({"success": True, "data": response})

        except Exception as e:
            app.logger.error("Ingest file error: %s", str(e))
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "File processing failed"}), 500


# @app.route("/api/upload", methods=["POST"])
# def upload():
#     if "file" not in request.files:
#         return jsonify({"success": False, "error": "No file part"}), 400
#     file = request.files["file"]

#     try:
#         file_path = f"/tmp/{file.filename}"
#         file.save(file_path)
#         result = client.predict([file_path], api_name="/_upload_file")
#         return jsonify({"success": True, "result": result})
#     except Exception as e:
#         return jsonify({"success": False, "error": str(e)}), 500


# @app.route("/api/select_file", methods=["POST"])
# def select_file():
#     try:

#         result = client.predict(api_name="/_selected_a_file")
#         return jsonify({"success": True, "result": result})
#     except Exception as e:
#         return jsonify({"success": False, "error": str(e)}), 500


# @app.route("/api/deselect_file", methods=["POST"])
# def deselect_file():
#     try:

#         result = client.predict(api_name="/_deselect_selected_file")
#         return jsonify({"success": True, "result": result})
#     except Exception as e:
#         return jsonify({"success": False, "error": str(e)}), 500


# @app.route("/api/delete_selected_file", methods=["DELETE"])
# def delete_selected_file():
#     try:

#         result = client.predict(api_name="/_delete_selected_file")
#         return jsonify({"success": True, "result": result})
#     except Exception as e:
#         return jsonify({"success": False, "error": str(e)}), 500


# @app.route("/api/delete_all_files", methods=["DELETE"])
# def delete_all_files():
#     try:

#         result = client.predict(api_name="/_delete_all_files")
#         return jsonify({"success": True, "result": result})
#     except Exception as e:
#         return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
