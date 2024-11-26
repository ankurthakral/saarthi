document.addEventListener("DOMContentLoaded", function () {
  const messageInput = document.getElementById("messageInput");
  const output = document.getElementById("output");
  const fileInput = document.getElementById("fileInput");
  const fileList = document.getElementById("fileList");
  const modeInputs = document.querySelectorAll('input[name="mode"]');
  let selectedMode = document.querySelector('input[name="mode"]:checked').value;
  let loadingElement = null;

  // Function to speak text with a specific voice
  function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);

    // Get the available voices
    const voices = window.speechSynthesis.getVoices();

    // Find the Indian accent voice (modify the name as per available voices)
    const indianVoice = voices.find(
      (voice) => voice.name === "Google UK English Female"
    );

    // Set the voice if found
    if (indianVoice) {
      utterance.voice = indianVoice;
    }

    // Speak the text
    window.speechSynthesis.speak(utterance);
  }

  // Ensure the voices are loaded before calling speakText
  window.speechSynthesis.onvoiceschanged = () => {
    const voices = window.speechSynthesis.getVoices();
    console.log(voices); // Log available voices to the console
  };

  // // Function to speak text
  // function speakText(text) {
  //   const utterance = new SpeechSynthesisUtterance(text);
  //   window.speechSynthesis.speak(utterance);
  // }

  // Stop speaking when mic starts listening
  function stopSpeaking() {
    window.speechSynthesis.cancel();
  }

  // Display the welcome message when the chat starts
  function showWelcomeMessage() {
    const welcomeMessage = document.createElement("div");
    welcomeMessage.className = "message received";
    welcomeMessage.innerHTML = `
      <img src="static/img/chat-bot-icon.png" alt="RailTel" class="avatar">
      <div class="message-content">
        <span class="gradient-text">Hello!</span>, How can I help you today?
      </div>
    `;
    output.appendChild(welcomeMessage);
    scrollToBottom();
    speakText("Hello! How can I help you today?"); // Speak the welcome message
  }

  // Call the welcome message function after the DOM is loaded
  showWelcomeMessage();

  // Check if annyang is supported
  if (annyang) {
    // Define commands
    const commands = {
      "*message": function (message) {
        messageInput.value = message; // Set the input value to the recognized text
        sendMessage(); // Send the message automatically
      },
    };

    // Add commands to annyang
    annyang.addCommands(commands);

    // Error handling
    annyang.addCallback("error", function (err) {
      console.error("Speech recognition error:", err);
    });

    // Start listening
    // Function to start listening with timeout
    function startListening() {
      stopSpeaking(); // Stop any ongoing speech before starting to listen
      // Start listening
      annyang.start();
      // Change to listening icon
      document.getElementById("micIcon").src = "static/img/listening_mic.png";

      // Stop listening after 10 seconds
      listeningTimeout = setTimeout(() => {
        stopListening();
      }, 6000); // 10,000 milliseconds = 10 seconds
    }

    // Function to stop listening and reset icon
    function stopListening() {
      annyang.abort();
      document.getElementById("micIcon").src = "static/img/mic.png"; // Change back to normal icon
      clearTimeout(listeningTimeout); // Clear the timeout if it exists
    }

    // Start listening when the mic button is clicked
    document.getElementById("micButton").addEventListener("click", function () {
      startListening();
    });

    // Stop listening when the message is sent
    document.getElementById("submit").addEventListener("click", function () {
      stopListening();
    });
  } else {
    console.error("Annyang is not supported in this browser.");
  }

  function setMode(mode) {
    fetch("/api/set_mode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mode }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          console.log(`Mode set to ${mode}`);
        } else {
          console.error("Error setting mode:", data.error);
        }
      })
      .catch((error) => console.error("Error setting mode:", error));
  }

  modeInputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      selectedMode = event.target.value;
      setMode(selectedMode);
    });
  });

  // Event listener for the "Enter" key
  messageInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      sendMessage();
    }
  });

  document.getElementById("submit").addEventListener("click", sendMessage);

  function scrollToBottom() {
    output.scrollTop = output.scrollHeight;
  }

  function sendMessage() {
    const message = messageInput.value;
    if (message.trim() === "") return;

    // Create the sent message element with the user avatar
    const messageElement = document.createElement("div");
    messageElement.className = "message sent";
    messageElement.innerHTML = `
    <img src="static/img/user.png" alt="User" class="avatar">
    <div class="message-content">${message}</div>
  `;
    output.appendChild(messageElement);

    // Add loading animation
    loadingElement = document.createElement("div");
    loadingElement.className = "message received loading";
    loadingElement.innerHTML = `
    <img src="static/img/chat-bot-icon.png" alt="RailTel" class="avatar">
    <div class="loading-content">
      <div class="loading-dot"></div>
      <div class="loading-dot"></div>
      <div class="loading-dot"></div>
    </div>
  `;
    output.appendChild(loadingElement);

    // Scroll to bottom after adding the loading animation
    scrollToBottom();

    const mode = document.querySelector('input[name="mode"]:checked').value;
    const files = []; // Currently no file selection handled in the UI
    const system_prompt = "Hello!!";

    fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, mode, files, system_prompt }),
    })
      .then((response) => response.json())
      .then((data) => {
        // Remove the loading animation
        if (loadingElement && loadingElement.parentNode) {
          output.removeChild(loadingElement);
          loadingElement = null;
        }

        // Function to format the reply text
        const formatReply = (reply) => {
          let formatted = reply.replace(/\n/g, "<br>");
          formatted = formatted.replace(/\n\* /g, "<br><ul><li>");
          formatted = formatted.replace(/<\/li><br>/g, "</li></ul><br>"); // Close the list
          return formatted;
        };

        // Create the received message element with the RailTel avatar
        const replyElement = document.createElement("div");
        replyElement.className = "message received";
        replyElement.innerHTML = `
        <img src="static/img/chat-bot-icon.png" alt="RailTel" class="avatar">
        <div class="message-content"></div>
      `;
        output.appendChild(replyElement);

        // Scroll to bottom after receiving the reply
        scrollToBottom();

        const replyMessage = data.reply; // Raw response
        // Speak the reply before formatting
        speakText(replyMessage);

        // Prepare the formatted reply
        let formattedReply = formatReply(replyMessage);

        // Check if mode is not "Chat" and if data.file_name exists, then add source information
        if (mode !== "Chat" && data.file_name) {
          formattedReply += `<br><br><strong>Source:</strong> ${
            data.file_name.split(".")[0]
          }, Page No: ${data.page_label}`;
        }

        // Typewriter effect
        const typeWriterEffect = (element, text, speed) => {
          let index = 0;
          const words = text.split(" "); // Split the text into words
          const typeInterval = setInterval(() => {
            if (index < words.length) {
              element.innerHTML += words[index] + " ";
              index++;
              scrollToBottom();
            } else {
              clearInterval(typeInterval);
            }
          }, speed);
        };

        // Start the typewriter effect with formatted reply
        const messageContentElement =
          replyElement.querySelector(".message-content");
        typeWriterEffect(messageContentElement, formattedReply, 50);
      })
      .catch((error) => {
        // Remove the loading animation
        if (loadingElement && loadingElement.parentNode) {
          output.removeChild(loadingElement);
          loadingElement = null;
        }

        const errorElement = document.createElement("div");
        errorElement.className = "message received";
        errorElement.innerHTML = `
        <img src="static/img/chat-bot-icon.png" alt="RailTel" class="avatar">
        <div class="message-content">Error: ${error.message}</div>
      `;
        output.appendChild(errorElement);

        scrollToBottom();
      });

    messageInput.value = "";
  }

  fileInput.addEventListener("change", () => {
    const files = fileInput.files;
    if (files.length === 0) return;

    const formData = new FormData();
    formData.append("file", files[0]);

    fetch("/api/upload", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          const fileElement = document.createElement("div");
          fileElement.textContent = files[0].name;
          fileList.appendChild(fileElement);
          alert("File Uploaded Successfully");
        } else {
          console.error("Error uploading file:", data.error);
        }
      })
      .catch((error) => console.error("Error uploading file:", error));
  });

  function listIngestedFiles() {
    fetch("/api/list_ingested_files", {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        if (data.success) {
          fileList.innerHTML = "";

          const uniqueFiles = new Set();

          // Loop through the data and add unique file names to the Set
          data.data.forEach((file) => {
            const fileName = file.doc_metadata.file_name;
            const fileNameWithoutExtension = fileName
              .split(".")
              .slice(0, -1)
              .join(".");
            uniqueFiles.add(fileNameWithoutExtension);
          });

          // Display the unique file names
          uniqueFiles.forEach((fileName) => {
            const fileElement = document.createElement("div");
            fileElement.textContent = fileName;
            fileList.appendChild(fileElement);
          });
        } else {
          console.error("Error listing files:", data.error);
        }
      })
      .catch((error) => console.error("Error listing files:", error));
  }

  document.getElementById("clearButton").addEventListener("click", () => {
    output.innerHTML = "";
  });

  document.getElementById("retryButton").addEventListener("click", sendMessage);

  document.getElementById("undoButton").addEventListener("click", () => {
    if (output.lastChild) {
      output.removeChild(output.lastChild);
    }
  });

  listIngestedFiles();
  console(fileList);
});

document.addEventListener("DOMContentLoaded", function () {
  const chatbotIcon = document.getElementById("chatbotIcon");
  const chatbotPopup = document.getElementById("chatbotPopup");

  chatbotIcon.addEventListener("click", function () {
    chatbotPopup.classList.toggle("open");
  });
});

function toggleMode() {
  document.getElementById("modeSection").classList.toggle("hidden");
}

function toggleUpload() {
  document.getElementById("uploadSection").classList.toggle("hidden");
}

function toggleFiles() {
  document.getElementById("fileList").classList.toggle("hidden");
}
