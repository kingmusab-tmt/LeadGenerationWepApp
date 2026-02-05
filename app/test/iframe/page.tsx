"use client";

import { useEffect, useState } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  Grid,
} from "@mui/material";

export default function IframeTestPage() {
  const [iframeCode, setIframeCode] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    // Listen for messages from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data.hasOwnProperty("FrameHeight")) {
        const iframes = document.querySelectorAll<HTMLIFrameElement>(
          "#preview-container iframe",
        );
        iframes.forEach((iframe) => {
          iframe.style.height = event.data.FrameHeight + "px";
        });
      }
      if (event.data.hasOwnProperty("RedirectURL")) {
        window.location.href = event.data.RedirectURL;
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const handlePreview = () => {
    if (iframeCode.trim()) {
      setShowPreview(true);
    }
  };

  const handleClear = () => {
    setIframeCode("");
    setShowPreview(false);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 1 }}>
        Iframe Testing & Preview
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>
        Paste your iframe embed code to preview how it will look on external
        websites
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={3} sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Paste Iframe Code
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Paste your complete iframe code including any scripts
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={20}
              placeholder={`<script type="text/javascript">
  window.addEventListener("message", function (event) {
    if (event.data.hasOwnProperty("FrameHeight")) {
      document.getElementById("iframeID").style.height = event.data.FrameHeight + "px";
    }
  });
</script>
<iframe id="iframeID" src="YOUR_FORM_URL" style="width:100%;border:0;"></iframe>`}
              value={iframeCode}
              onChange={(e) => setIframeCode(e.target.value)}
              sx={{
                mb: 2,
                "& textarea": {
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                },
              }}
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                onClick={handlePreview}
                disabled={!iframeCode.trim()}
                fullWidth
              >
                Preview
              </Button>
              <Button
                variant="outlined"
                onClick={handleClear}
                disabled={!iframeCode.trim()}
                fullWidth
              >
                Clear
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={3} sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Live Preview
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              This shows how your iframe will appear when embedded on external
              websites
            </Alert>

            {showPreview && iframeCode ? (
              <Box
                id="preview-container"
                sx={{
                  border: "2px solid #e0e0e0",
                  borderRadius: 1,
                  backgroundColor: "#ffffff",
                  minHeight: "500px",
                  overflow: "auto",
                }}
                dangerouslySetInnerHTML={{ __html: iframeCode }}
              />
            ) : (
              <Box
                sx={{
                  border: "2px dashed #ccc",
                  p: 6,
                  borderRadius: 1,
                  textAlign: "center",
                  backgroundColor: "#f9f9f9",
                  minHeight: "500px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography color="textSecondary">
                  Paste your iframe code and click Preview to see it here
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Example Iframe Code
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Sample iframe implementation with dynamic height adjustment:
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={12}
          value={`<script type="text/javascript">
  window.addEventListener("message", function (event) {
    if (event.data.hasOwnProperty("FrameHeight")) {
      document.getElementById("iframeID-2").style.height = event.data.FrameHeight+"px"        
    }
    if (event.data.hasOwnProperty("RedirectURL")) {
      window.location.href = event.data.RedirectURL;     
    }
  });
  function setIframeHeight(ifrm) {
    var height = ifrm.contentWindow.postMessage("FrameHeight", "*");   
  }
</script>
<iframe id="iframeID-2" onload="setIframeHeight(this)" scrolling="no" style="border:0px;width:100%;overflow:hidden;" src="https://leadsimplify.net/3410/form/2"></iframe>`}
          InputProps={{
            readOnly: true,
            sx: { fontFamily: "monospace", fontSize: "0.85rem" },
          }}
        />
        <Button
          variant="outlined"
          onClick={() => {
            const exampleCode = `<script type="text/javascript">
  window.addEventListener("message", function (event) {
    if (event.data.hasOwnProperty("FrameHeight")) {
      document.getElementById("iframeID-2").style.height = event.data.FrameHeight+"px"        
    }
    if (event.data.hasOwnProperty("RedirectURL")) {
      window.location.href = event.data.RedirectURL;     
    }
  });
  function setIframeHeight(ifrm) {
    var height = ifrm.contentWindow.postMessage("FrameHeight", "*");   
  }
</script>
<iframe id="iframeID-2" onload="setIframeHeight(this)" scrolling="no" style="border:0px;width:100%;overflow:hidden;" src="https://leadsimplify.net/3410/form/2"></iframe>`;
            setIframeCode(exampleCode);
          }}
          sx={{ mt: 2 }}
        >
          Use This Example
        </Button>
      </Paper>
    </Container>
  );
}
