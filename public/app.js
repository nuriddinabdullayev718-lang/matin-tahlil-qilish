async function analyze() {
  const file = document.getElementById("fileInput").files[0];
  const text = document.getElementById("textInput").value;

  const formData = new FormData();
  if (file) formData.append("file", file);
  if (text) formData.append("text", text);

  const res = await fetch("/api/analyze", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  document.getElementById("original").innerText = data.original || "";
  document.getElementById("corrected").innerText = data.corrected || "";
}
