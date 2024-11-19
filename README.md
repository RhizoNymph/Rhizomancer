# Rhizomancer

This is a plugin for whatever I want to do in obsidian because splitting functionalities seems like a fool's errand.

To install this, clone it to your Obsidian vaults .obsidian/plugins directory and run 'npm install' then 'npm run dev'.
If you use nix, you can use 'nix develop' instead of 'npm install'. After running 'npm run dev' you should see 'build finished' in your console.

The AI functionality is handled by a flask server at: <https://github.com/RhizoNymph/DwarfInTheFlask>.

Clone it onto a PC with Cuda installed (I'm assuming you have a cuda capable gpu, if you want to use anything outside of the base /chat route you'll need it, if not then you can get away without it. Will do my best to relax this requirement in the future).

Run 'uv run flask_server.py' and then in your Obsidian settings panel at the bottom on the left you should see the settings for this plugin. Set the server address to where you're running the flask server. Default is https://127.0.0.1:5000. If you can run flash attention you should also run 'uv pip install flash-attn --no-build-isolation'. This one might take a while, flash attn take a long time to build. It's supposed to be fast with ninja but idk. You can use the requirements.txt if you don't want to use uv, but you really should just use uv.

To index files, go to the in your vault so they're the active file and then use Ctrl+P and use the 'index current pdf' or 'index current markdown file'. Then you'll get a modal for what index to send it to. They all get individual indices as well so that you can search each individually. That's controlled by a radio button in the chat panel (open with the speech bubble on the sidebar).

If you select an index, it will search that index name for both text chunk and pdf pages and present them with checkboxes to deselect what isn't actually relevant. When you click submit, it will use the /chat route on the flask server to send your chosen RAG results. If you select current file, it will use the individual index instead. If you don't type a chat query, it skips RAG completely.

This does NOT have chat history OR multiple chats at the moment.

Whisper transcription doesn't work great on long files right now, I haven't spent much time trying to fix it but it's there.
PDF to markdown conversion is an artifact of needing to use it for PDF RAG before byaldi came out, I don't really use it but it's still here.

This also has easy indexing of the ZK podcast transcripts, revolutions podcast transcripts, and pdfs of Huggingface daily papers through the dice icon on the left sidebar. These are behind the icon of a die in the left sidebar.

Roadmap:
- Cloud/local options for everything
- Better Whisper
- Docs
- Whatever the fuck I want
