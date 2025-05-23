// "use client";
// import React, { useState, useEffect } from "react";
// import UserDashboard from "../layout";
// import {
//   Box,
//   Typography,
//   Divider,
//   TextField,
//   InputAdornment,
//   CircularProgress,
//   Card,
//   CardContent,
//   CardHeader,
//   List,
//   ListItem,
//   ListItemAvatar,
//   Avatar,
//   ListItemText,
//   Paper,
//   Button,
//   IconButton,
//   Chip,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
// } from "@mui/material";
// import {
//   PlayCircle,
//   Search,
//   ContactSupport,
//   SupportAgent,
//   Chat,
//   CheckCircle,
// } from "@mui/icons-material";
// import axios from "axios";
// import TicketForm from "@/app/components/generalComponent/ticketForm";
// import TicketStatusForm from "@/app/components/generalComponent/TicketStatusForm";
// import LiveChatForm from "@/app/components/generalComponent/livechatform";

// const HelpSection = () => {
//   const [videos, setVideos] = useState<
//     {
//       id: string;
//       title: string;
//       description: string;
//       url: string;
//       category?: string;
//       duration?: string;
//       uploadDate?: string;
//     }[]
//   >([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedVideo, setSelectedVideo] = useState<{
//     id: string;
//     title: string;
//     description: string;
//     url: string;
//     category?: string;
//     duration?: string;
//     uploadDate?: string;
//   } | null>(null);
//   const [faqs, setFaqs] = useState<
//     {
//       id: string;
//       question: string;
//       answer: string;
//     }[]
//   >([]);
//   const [openModal, setOpenModal] = useState(false);
//   const [modalContent, setModalContent] = useState<{
//     title: string;
//     component: React.ReactNode;
//   } | null>(null);

//   useEffect(() => {
//     const fetchHelpData = async () => {
//       try {
//         setLoading(true);
//         const [videosResponse, faqsResponse] = await Promise.all([
//           axios.get("/api/help/videos"),
//           axios.get("/api/help/faqs"),
//         ]);

//         setVideos(videosResponse.data);
//         setFaqs(faqsResponse.data);

//         if (videosResponse.data.length > 0) {
//           setSelectedVideo(videosResponse.data[0]);
//         }
//       } catch (err) {
//         setError("Failed to load help content. Please try again later.");
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchHelpData();
//   }, []);

//   const filteredVideos = videos.filter(
//     (video) =>
//       video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       video.description.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const filteredFaqs = faqs.filter(
//     (faq) =>
//       faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const extractYoutubeId = (url: string) => {
//     const regExp =
//       /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
//     const match = url.match(regExp);
//     return match && match[2].length === 11 ? match[2] : null;
//   };

//   const handleQuickHelpClick = (action: string) => {
//     switch (action) {
//       case "submit":
//         setModalContent({
//           title: "Submit Support Ticket",
//           component: <TicketForm />,
//         });
//         break;
//       case "status":
//         setModalContent({
//           title: "Check Ticket Status",
//           component: <TicketStatusForm />,
//         });
//         break;
//       case "chat":
//         setModalContent({
//           title: "Live Chat Support",
//           component: <LiveChatForm />,
//         });
//         break;
//       default:
//         return;
//     }
//     setOpenModal(true);
//   };

//   const handleCloseModal = () => {
//     setOpenModal(false);
//     setModalContent(null);
//   };

//   return (
//     <UserDashboard>
//       <Box sx={{ p: 3 }}>
//         <Typography variant="h4" gutterBottom>
//           Help Center
//         </Typography>
//         <Typography variant="subtitle1" color="text.secondary" gutterBottom>
//           Find tutorials, guides, and answers to common questions
//         </Typography>

//         <Divider sx={{ my: 3 }} />

//         <TextField
//           fullWidth
//           variant="outlined"
//           placeholder="Search help articles or videos..."
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//           InputProps={{
//             startAdornment: (
//               <InputAdornment position="start">
//                 <Search />
//               </InputAdornment>
//             ),
//           }}
//           sx={{ mb: 3 }}
//         />

//         {loading ? (
//           <Box display="flex" justifyContent="center" mt={4}>
//             <CircularProgress />
//           </Box>
//         ) : error ? (
//           <Paper elevation={3} sx={{ p: 2, backgroundColor: "error.light" }}>
//             <Typography color="error">{error}</Typography>
//           </Paper>
//         ) : (
//           <Box
//             display="flex"
//             flexDirection={{ xs: "column", md: "row" }}
//             gap={3}
//           >
//             {/* Main Content */}
//             <Box flex={2}>
//               <Card>
//                 <CardHeader
//                   title={selectedVideo?.title || "Select a video"}
//                   subheader={
//                     selectedVideo?.category && (
//                       <Chip label={selectedVideo.category} size="small" />
//                     )
//                   }
//                 />
//                 <CardContent>
//                   {selectedVideo ? (
//                     <>
//                       <Box
//                         sx={{
//                           position: "relative",
//                           paddingBottom: "56.25%", // 16:9
//                           height: 0,
//                           overflow: "hidden",
//                           mb: 2,
//                         }}
//                       >
//                         <iframe
//                           style={{
//                             position: "absolute",
//                             top: 0,
//                             left: 0,
//                             width: "100%",
//                             height: "100%",
//                           }}
//                           src={`https://www.youtube.com/embed/${extractYoutubeId(
//                             selectedVideo.url
//                           )}`}
//                           frameBorder="0"
//                           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//                           allowFullScreen
//                           title={selectedVideo.title}
//                         />
//                       </Box>
//                       <Typography variant="body1" paragraph>
//                         {selectedVideo.description}
//                       </Typography>
//                       <Typography variant="caption" color="text.secondary">
//                         Duration: {selectedVideo.duration} | Uploaded:{" "}
//                         {selectedVideo.uploadDate
//                           ? new Date(
//                               selectedVideo.uploadDate
//                             ).toLocaleDateString()
//                           : "Unknown"}
//                       </Typography>
//                     </>
//                   ) : (
//                     <Typography>No video selected</Typography>
//                   )}
//                 </CardContent>
//               </Card>

//               {/* FAQ Section */}
//               <Card sx={{ mt: 3 }}>
//                 <CardHeader title="Frequently Asked Questions" />
//                 <CardContent>
//                   <List>
//                     {filteredFaqs.map((faq) => (
//                       <React.Fragment key={faq.id}>
//                         <ListItem alignItems="flex-start">
//                           <ListItemText
//                             primary={
//                               <Typography fontWeight="bold">
//                                 {faq.question}
//                               </Typography>
//                             }
//                             secondary={faq.answer}
//                           />
//                         </ListItem>
//                         <Divider component="li" />
//                       </React.Fragment>
//                     ))}
//                   </List>
//                 </CardContent>
//               </Card>
//             </Box>

//             {/* Sidebar */}
//             <Box flex={1}>
//               <Card>
//                 <CardHeader title="Video Tutorials" />
//                 <CardContent>
//                   <List dense>
//                     {filteredVideos.map((video) => (
//                       <ListItem
//                         key={video.id}
//                         component="button"
//                         onClick={() => setSelectedVideo(video)}
//                         sx={{
//                           borderRadius: 1,
//                           mb: 1,
//                           backgroundColor:
//                             selectedVideo?.id === video.id
//                               ? "action.selected"
//                               : "inherit",
//                           outline:
//                             selectedVideo?.id === video.id
//                               ? "2px solid"
//                               : "none",
//                         }}
//                       >
//                         <ListItemAvatar>
//                           <Avatar>
//                             <PlayCircle />
//                           </Avatar>
//                         </ListItemAvatar>
//                         <ListItemText
//                           primary={video.title}
//                           secondary={
//                             <Typography
//                               noWrap
//                               variant="body2"
//                               color="text.secondary"
//                             >
//                               {video.description}
//                             </Typography>
//                           }
//                         />
//                       </ListItem>
//                     ))}
//                   </List>
//                 </CardContent>
//               </Card>

//               {/* Quick Help */}
//               <Card sx={{ mt: 3 }}>
//                 <CardHeader title="Quick Help" />
//                 <CardContent>
//                   <List>
//                     <ListItem>
//                       <Button
//                         startIcon={<ContactSupport />}
//                         fullWidth
//                         sx={{ justifyContent: "flex-start" }}
//                         onClick={() => handleQuickHelpClick("submit")}
//                       >
//                         Submit Ticket
//                       </Button>
//                     </ListItem>
//                     <ListItem>
//                       <Button
//                         startIcon={<CheckCircle />}
//                         fullWidth
//                         sx={{ justifyContent: "flex-start" }}
//                         onClick={() => handleQuickHelpClick("status")}
//                       >
//                         Follow-Up Ticket Status
//                       </Button>
//                     </ListItem>
//                     <ListItem>
//                       <Button
//                         startIcon={<Chat />}
//                         fullWidth
//                         sx={{ justifyContent: "flex-start" }}
//                         onClick={() => handleQuickHelpClick("chat")}
//                       >
//                         Live Chat
//                       </Button>
//                     </ListItem>
//                   </List>
//                 </CardContent>
//               </Card>
//             </Box>
//           </Box>
//         )}
//       </Box>

//       {/* Modal Dialog for Quick Help Actions */}
//       <Dialog
//         open={openModal}
//         onClose={handleCloseModal}
//         maxWidth="sm"
//         fullWidth
//       >
//         {modalContent && (
//           <>
//             <DialogTitle>{modalContent.title}</DialogTitle>
//             <DialogContent dividers>{modalContent.component}</DialogContent>
//             <DialogActions>
//               <Button onClick={handleCloseModal}>Close</Button>
//             </DialogActions>
//           </>
//         )}
//       </Dialog>
//     </UserDashboard>
//   );
// };

// export default HelpSection;
"use client";
import React, { useState, useEffect } from "react";
import UserDashboard from "../layout";
import {
  Box,
  Typography,
  Divider,
  TextField,
  InputAdornment,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Paper,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  PlayCircle,
  Search,
  ContactSupport,
  SupportAgent,
  Chat,
  CheckCircle,
} from "@mui/icons-material";
import axios from "axios";
import TicketForm from "@/app/components/generalComponent/ticketForm";
import TicketStatusForm from "@/app/components/generalComponent/TicketStatusForm";
import TawkChatWidget from "@/app/components/generalComponent/livechat";

const HelpSection = () => {
  const [videos, setVideos] = useState<
    {
      id: string;
      title: string;
      description: string;
      url: string;
      category?: string;
      duration?: string;
      uploadDate?: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<{
    id: string;
    title: string;
    description: string;
    url: string;
    category?: string;
    duration?: string;
    uploadDate?: string;
  } | null>(null);
  const [faqs, setFaqs] = useState<
    {
      id: string;
      question: string;
      answer: string;
    }[]
  >([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    component: React.ReactNode;
  } | null>(null);
  const [showChatWidget, setShowChatWidget] = useState(false);

  useEffect(() => {
    const fetchHelpData = async () => {
      try {
        setLoading(true);
        const [videosResponse, faqsResponse] = await Promise.all([
          axios.get("/api/help/videos"),
          axios.get("/api/help/faqs"),
        ]);

        setVideos(videosResponse.data);
        setFaqs(faqsResponse.data);

        if (videosResponse.data.length > 0) {
          setSelectedVideo(videosResponse.data[0]);
        }
      } catch (err) {
        setError("Failed to load help content. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHelpData();
  }, []);

  const filteredVideos = videos.filter(
    (video) =>
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const extractYoutubeId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleQuickHelpClick = (action: string) => {
    switch (action) {
      case "submit":
        setModalContent({
          title: "Submit Support Ticket",
          component: <TicketForm />,
        });
        setOpenModal(true);
        break;
      case "status":
        setModalContent({
          title: "Check Ticket Status",
          component: <TicketStatusForm />,
        });
        setOpenModal(true);
        break;
      case "chat":
        setShowChatWidget(true);
        break;
      default:
        return;
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setModalContent(null);
  };

  return (
    <UserDashboard>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Help Center
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Find tutorials, guides, and answers to common questions
        </Typography>

        <Divider sx={{ my: 3 }} />

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search help articles or videos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        {loading ? (
          <Box display="flex" justifyContent="center" mt={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper elevation={3} sx={{ p: 2, backgroundColor: "error.light" }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        ) : (
          <Box
            display="flex"
            flexDirection={{ xs: "column", md: "row" }}
            gap={3}
          >
            {/* Main Content */}
            <Box flex={2}>
              <Card>
                <CardHeader
                  title={selectedVideo?.title || "Select a video"}
                  subheader={
                    selectedVideo?.category && (
                      <Chip label={selectedVideo.category} size="small" />
                    )
                  }
                />
                <CardContent>
                  {selectedVideo ? (
                    <>
                      <Box
                        sx={{
                          position: "relative",
                          paddingBottom: "56.25%", // 16:9
                          height: 0,
                          overflow: "hidden",
                          mb: 2,
                        }}
                      >
                        <iframe
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                          }}
                          src={`https://www.youtube.com/embed/${extractYoutubeId(
                            selectedVideo.url
                          )}`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={selectedVideo.title}
                        />
                      </Box>
                      <Typography variant="body1" paragraph>
                        {selectedVideo.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Duration: {selectedVideo.duration} | Uploaded:{" "}
                        {selectedVideo.uploadDate
                          ? new Date(
                              selectedVideo.uploadDate
                            ).toLocaleDateString()
                          : "Unknown"}
                      </Typography>
                    </>
                  ) : (
                    <Typography>No video selected</Typography>
                  )}
                </CardContent>
              </Card>

              {/* FAQ Section */}
              <Card sx={{ mt: 3 }}>
                <CardHeader title="Frequently Asked Questions" />
                <CardContent>
                  <List>
                    {filteredFaqs.map((faq) => (
                      <React.Fragment key={faq.id}>
                        <ListItem alignItems="flex-start">
                          <ListItemText
                            primary={
                              <Typography fontWeight="bold">
                                {faq.question}
                              </Typography>
                            }
                            secondary={faq.answer}
                          />
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Box>

            {/* Sidebar */}
            <Box flex={1}>
              <Card>
                <CardHeader title="Video Tutorials" />
                <CardContent>
                  <List dense>
                    {filteredVideos.map((video) => (
                      <ListItem
                        key={video.id}
                        component="button"
                        onClick={() => setSelectedVideo(video)}
                        sx={{
                          borderRadius: 1,
                          mb: 1,
                          backgroundColor:
                            selectedVideo?.id === video.id
                              ? "action.selected"
                              : "inherit",
                          outline:
                            selectedVideo?.id === video.id
                              ? "2px solid"
                              : "none",
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar>
                            <PlayCircle />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={video.title}
                          secondary={
                            <Typography
                              noWrap
                              variant="body2"
                              color="text.secondary"
                            >
                              {video.description}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>

              {/* Quick Help */}
              <Card sx={{ mt: 3 }}>
                <CardHeader title="Quick Help" />
                <CardContent>
                  <List>
                    <ListItem>
                      <Button
                        startIcon={<ContactSupport />}
                        fullWidth
                        sx={{ justifyContent: "flex-start" }}
                        onClick={() => handleQuickHelpClick("submit")}
                      >
                        Submit Ticket
                      </Button>
                    </ListItem>
                    <ListItem>
                      <Button
                        startIcon={<CheckCircle />}
                        fullWidth
                        sx={{ justifyContent: "flex-start" }}
                        onClick={() => handleQuickHelpClick("status")}
                      >
                        Follow-Up Ticket Status
                      </Button>
                    </ListItem>
                    <ListItem>
                      <Button
                        startIcon={<Chat />}
                        fullWidth
                        sx={{ justifyContent: "flex-start" }}
                        onClick={() => handleQuickHelpClick("chat")}
                      >
                        Live Chat
                      </Button>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}
      </Box>

      {/* Modal Dialog for Quick Help Actions (except chat) */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
      >
        {modalContent && (
          <>
            <DialogTitle>{modalContent.title}</DialogTitle>
            <DialogContent dividers>{modalContent.component}</DialogContent>
            <DialogActions>
              <Button onClick={handleCloseModal}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Tawk Chat Widget */}
      <TawkChatWidget open={showChatWidget} />
    </UserDashboard>
  );
};

export default HelpSection;
