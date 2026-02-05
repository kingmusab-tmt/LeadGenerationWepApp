# BRIXCOT Lead Generation Platform - Component Structure & Deployment

## Document 3 of 3: Frontend Components, Technical Features, and Production Deployment

---

## 1. DASHBOARD COMPONENT STRUCTURE

### A. Seller Dashboard Components

#### Navigation Structure

```
app/dashboard/seller/layout.tsx
│
└─> <UserDashboard userRole="seller">
    ├─> Sidebar Navigation
    │   ├─> Overview
    │   ├─> Lead Management
    │   │   ├─> All Leads
    │   │   ├─> Form Builder
    │   │   ├─> Submitted Forms
    │   │   └─> Form Analytics
    │   ├─> Buyer Management
    │   ├─> Campaigns
    │   ├─> Automation
    │   ├─> Call Tracking
    │   ├─> Analytics & Reports
    │   ├─> Integrations
    │   ├─> Settings
    │   └─> Help
    │
    ├─> Top Bar
    │   ├─> Notifications (bell icon)
    │   ├─> User Menu (avatar + dropdown)
    │   └─> Wallet Balance Display
    │
    └─> Main Content Area
        - Renders child page components
        - Common Box wrapper: <Box sx={{ width: "100%" }}>
```

---

#### Overview Dashboard

**File**: `app/dashboard/seller/overview/page.tsx`

**Component Tree**:

```
<OverviewPage>
│
├─> <Grid container spacing={3}>
│   │
│   ├─> Key Metrics Cards (Grid items)
│   │   ├─> <MetricCard title="Total Leads" value={stats.totalLeads} icon={<LeadsIcon/>} />
│   │   ├─> <MetricCard title="Active Buyers" value={stats.activeBuyers} />
│   │   ├─> <MetricCard title="Revenue This Month" value={stats.revenue} />
│   │   └─> <MetricCard title="Conversion Rate" value={stats.conversionRate} />
│   │
│   ├─> Charts Section
│   │   ├─> <Card>
│   │   │   └─> <LeadTrendChart data={leadTrendData} />
│   │   │       - Line chart (Recharts)
│   │   │       - Shows leads over last 30 days
│   │   │       - Breakdown by status
│   │   │
│   │   └─> <Card>
│   │       └─> <RevenueChart data={revenueData} />
│   │           - Bar chart
│   │           - Monthly revenue
│   │
│   ├─> Recent Activity Feed
│   │   └─> <ActivityFeed activities={recentActivities} />
│   │       - List of recent events
│   │       - Icons + timestamps
│   │       - Click to view details
│   │
│   └─> Quick Actions
│       └─> <QuickActions>
│           ├─> <Button>Create Form</Button>
│           ├─> <Button>Add Buyer</Button>
│           └─> <Button>View Analytics</Button>
│
└─> Data Fetching
    useEffect(() => {
      async function fetchDashboardData() {
        const [stats, trends, activities] = await Promise.all([
          fetch('/api/dashboard/stats').then(r => r.json()),
          fetch('/api/dashboard/trends').then(r => r.json()),
          fetch('/api/dashboard/activities').then(r => r.json())
        ]);

        setStats(stats.data);
        setLeadTrendData(trends.data);
        setRecentActivities(activities.data);
      }

      fetchDashboardData();
    }, []);
```

**API Routes Used**:

- `GET /api/dashboard/stats` - Aggregate statistics
- `GET /api/dashboard/trends` - Time-series data
- `GET /api/dashboard/activities` - Recent activity log

---

#### Lead Management

**File**: `app/dashboard/seller/lead_management/page.tsx`

**Component Structure**:

```
<LeadManagementPage>
│
├─> Header Section
│   ├─> <Typography variant="h4">Lead Management</Typography>
│   └─> <Button onClick={handleExport}>Export Leads</Button>
│
├─> Filters & Search
│   └─> <LeadFilters>
│       ├─> <TextField label="Search" onChange={handleSearch} />
│       ├─> <Select label="Status" options={statusOptions} />
│       ├─> <Select label="Industry" options={industries} />
│       ├─> <DateRangePicker onChange={handleDateFilter} />
│       └─> <Button onClick={clearFilters}>Clear Filters</Button>
│
├─> Bulk Actions
│   └─> <BulkActionsBar selectedLeads={selectedLeads}>
│       ├─> <Button onClick={handleBulkAssign}>Assign to Buyer</Button>
│       ├─> <Button onClick={handleBulkDelete}>Delete</Button>
│       └─> <Button onClick={handleBulkExport}>Export Selected</Button>
│
├─> Leads Table
│   └─> <DataGrid
│       rows={filteredLeads}
│       columns={leadColumns}
│       checkboxSelection
│       onSelectionModelChange={setSelectedLeads}
│       pagination
│       pageSize={20}
│     />
│
│   Column Configuration:
│   - Checkbox (select)
│   - Lead Score (⭐ rating)
│   - Name (link to detail page)
│   - Email
│   - Phone
│   - Company
│   - Industry
│   - Status (chip with color)
│   - Created Date
│   - Actions (dropdown menu)
│
├─> Lead Detail Modal
│   └─> <LeadDetailsModal open={modalOpen} leadId={selectedLeadId}>
│       ├─> Basic Information
│       │   - Name, Email, Phone, Company
│       │   - Lead Source, Industry
│       │   - Location details
│       │
│       ├─> Scoring Details
│       │   - Lead Score: 8/10
│       │   - Qualification Score: 80/100
│       │   - Score breakdown (chart)
│       │
│       ├─> Timeline
│       │   - Lead created
│       │   - Lead qualified
│       │   - Assigned to buyer
│       │   - Accepted by buyer
│       │
│       ├─> Custom Fields
│       │   - Display all form submission data
│       │
│       ├─> Assignments
│       │   - List of buyers assigned
│       │   - Status of each assignment
│       │
│       └─> Actions
│           - <Button>Assign to Buyer</Button>
│           - <Button>Edit Lead</Button>
│           - <Button>Delete Lead</Button>
│
└─> Pagination & Stats
    ├─> <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} />
    └─> <Typography>Showing {start}-{end} of {total} leads</Typography>
```

**Key Features**:

1. **Real-time Updates**: WebSocket connection for live lead updates
2. **Advanced Filtering**: Multi-criteria filtering with AND/OR logic
3. **Bulk Operations**: Select multiple leads for batch actions
4. **Export**: CSV/Excel export with custom column selection
5. **Inline Editing**: Quick edit lead details without modal

**State Management**:

```typescript
const [leads, setLeads] = useState([]);
const [filteredLeads, setFilteredLeads] = useState([]);
const [selectedLeads, setSelectedLeads] = useState([]);
const [filters, setFilters] = useState({
  status: "all",
  industry: "all",
  dateRange: null,
  searchQuery: "",
});

// Redux for global state
const dispatch = useDispatch();
const { leads: reduxLeads } = useSelector((state) => state.leads);
```

---

#### Form Builder

**File**: `app/dashboard/seller/lead_management/formbuilder/page.tsx`

**Component Architecture**:

```
<FormBuilderPage>
│
├─> <FormProvider> (React Hook Form)
│   │
│   ├─> Form Settings Panel (Left)
│   │   └─> <Card>
│   │       ├─> <TextField name="formName" label="Form Name" />
│   │       ├─> <Select name="industry" label="Industry" />
│   │       ├─> <TextField name="leadSource" label="Lead Source" />
│   │       └─> <ColorPicker name="primaryColor" label="Primary Color" />
│   │
│   ├─> Field Builder (Center)
│   │   └─> <DndProvider backend={HTML5Backend}>
│   │       │
│   │       ├─> Available Fields Palette
│   │       │   └─> <Grid container>
│   │       │       ├─> <DraggableFieldType type="text" icon={<TextIcon/>} />
│   │       │       ├─> <DraggableFieldType type="email" />
│   │       │       ├─> <DraggableFieldType type="phone" />
│   │       │       ├─> <DraggableFieldType type="select" />
│   │       │       ├─> <DraggableFieldType type="checkbox" />
│   │       │       ├─> <DraggableFieldType type="radio" />
│   │       │       ├─> <DraggableFieldType type="textarea" />
│   │       │       ├─> <DraggableFieldType type="number" />
│   │       │       └─> <DraggableFieldType type="date" />
│   │       │
│   │       ├─> Drop Zone (Form Canvas)
│   │       │   └─> <DroppableArea>
│   │       │       {fields.map((field, index) => (
│   │       │         <DraggableFormField
│   │       │           key={field.id}
│   │       │           field={field}
│   │       │           index={index}
│   │       │           onEdit={() => openFieldEditor(field)}
│   │       │           onDelete={() => removeField(field.id)}
│   │       │         />
│   │       │       ))}
│   │       │
│   │       │       {fields.length === 0 && (
│   │       │         <EmptyState>
│   │       │           Drag and drop fields here
│   │       │         </EmptyState>
│   │       │       )}
│   │       │
│   │       └─> Field Editor Modal
│   │           └─> <Modal open={editorOpen}>
│   │               ├─> <TextField label="Field Label" />
│   │               ├─> <Checkbox label="Required" />
│   │               ├─> <TextField label="Placeholder" />
│   │               ├─> {field.type === 'select' && (
│   │               │     <OptionsEditor options={field.options} />
│   │               │   )}
│   │               ├─> <ValidationRules field={field} />
│   │               └─> <Button onClick={saveField}>Save</Button>
│   │
│   └─> Live Preview Panel (Right)
│       └─> <Card>
│           ├─> <Typography variant="h6">Live Preview</Typography>
│           ├─> <Divider />
│           └─> <FormPreview fields={fields} styling={formStyling} />
│               - Renders actual form as users will see it
│               - Interactive (can test functionality)
│               - Responsive preview (mobile/tablet/desktop)
│
├─> Action Buttons (Bottom)
│   ├─> <Button onClick={saveDraft}>Save as Draft</Button>
│   ├─> <Button onClick={publishForm} variant="contained">Publish Form</Button>
│   └─> <Button onClick={handleCancel}>Cancel</Button>
│
└─> Embed Code Modal
    └─> <Modal open={embedModalOpen}>
        ├─> <Typography>Your form is published!</Typography>
        ├─> <Typography>Form URL: {formUrl}</Typography>
        ├─> <Button onClick={copyUrl}>Copy URL</Button>
        ├─> <CodeBlock language="html">
        │     {embedCode}
        │   </CodeBlock>
        ├─> <Button onClick={copyEmbedCode}>Copy Embed Code</Button>
        └─> <Button onClick={testForm} target="_blank">Test Form</Button>
```

**Drag & Drop Logic**:

```typescript
const handleDrop = (item: FieldType, monitor: DropTargetMonitor) => {
  const newField: FormField = {
    id: uuidv4(),
    type: item.type,
    label: `${item.type} Field`,
    required: false,
    placeholder: "",
    options:
      item.type === "select" || item.type === "radio"
        ? ["Option 1"]
        : undefined,
    validation: getDefaultValidation(item.type),
  };

  setFields([...fields, newField]);
};

const moveField = (dragIndex: number, hoverIndex: number) => {
  const draggedField = fields[dragIndex];
  const updatedFields = [...fields];
  updatedFields.splice(dragIndex, 1);
  updatedFields.splice(hoverIndex, 0, draggedField);
  setFields(updatedFields);
};
```

**Form Submission**:

```typescript
const handlePublishForm = async () => {
  try {
    const formData = {
      formName,
      industry,
      leadSource,
      fields: fields.map((f) => ({
        id: f.id,
        type: f.type,
        label: f.label,
        required: f.required,
        placeholder: f.placeholder,
        options: f.options,
        validation: f.validation,
      })),
      styling: {
        primaryColor,
        buttonText,
        successMessage,
      },
    };

    const response = await fetch("/api/form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (result.success) {
      setFormId(result.data.formId);
      setFormUrl(`${window.location.origin}/forms/${result.data.formId}`);
      setEmbedCode(generateEmbedCode(result.data.formId));
      setEmbedModalOpen(true);
    }
  } catch (error) {
    toast.error("Failed to publish form");
  }
};
```

---

#### Buyer Management

**File**: `app/dashboard/seller/lead_buyers_management/page.tsx`

**Component Layout**:

```
<BuyerManagementPage>
│
├─> Header Actions
│   ├─> <Button onClick={openAddBuyerModal}>Add New Buyer</Button>
│   └─> <Button onClick={openBulkImport}>Bulk Import</Button>
│
├─> Buyers Grid/List Toggle
│   └─> <ToggleButtonGroup value={viewMode}>
│       ├─> <ToggleButton value="grid"><GridIcon/></ToggleButton>
│       └─> <ToggleButton value="list"><ListIcon/></ToggleButton>
│
├─> {viewMode === 'grid' ? (
│   │   <Grid container spacing={2}>
│   │     {buyers.map(buyer => (
│   │       <Grid item xs={12} sm={6} md={4} key={buyer._id}>
│   │         <BuyerCard buyer={buyer}>
│   │           ├─> <Avatar>{buyer.name[0]}</Avatar>
│   │           ├─> <Typography variant="h6">{buyer.name}</Typography>
│   │           ├─> <Chip label={buyer.status} color={statusColor} />
│   │           ├─> <Typography>Leads: {buyer.leadsCount}</Typography>
│   │           ├─> <Typography>Wallet: {buyer.walletUnit} units</Typography>
│   │           └─> <ButtonGroup>
│   │               ├─> <IconButton onClick={viewBuyer}><ViewIcon/></IconButton>
│   │               ├─> <IconButton onClick={editBuyer}><EditIcon/></IconButton>
│   │               └─> <IconButton onClick={deleteBuyer}><DeleteIcon/></IconButton>
│   │             </ButtonGroup>
│   │         </BuyerCard>
│   │       </Grid>
│   │     ))}
│   │   </Grid>
│   ) : (
│   │   <DataGrid
│   │     rows={buyers}
│   │     columns={buyerColumns}
│   │     pageSize={20}
│   │   />
│   )}
│
├─> Add Buyer Modal
│   └─> <Dialog open={addBuyerModalOpen}>
│       <form onSubmit={handleAddBuyer}>
│         ├─> <TextField name="name" label="Buyer Name" required />
│         ├─> <TextField name="email" label="Email" type="email" required />
│         ├─> <TextField name="phone" label="Phone" />
│         ├─> <TextField name="company" label="Company" />
│         │
│         ├─> <Typography>Industries</Typography>
│         ├─> <FormGroup>
│         │     {industryOptions.map(ind => (
│         │       <FormControlLabel
│         │         control={<Checkbox name="industries" value={ind} />}
│         │         label={ind}
│         │       />
│         │     ))}
│         │   </FormGroup>
│         │
│         ├─> <Typography>Service Locations</Typography>
│         ├─> <ServiceLocationEditor locations={serviceLocations} />
│         │   - Add state/city
│         │   - Define service radius
│         │
│         ├─> <TextField name="maxLeadsPerDay" label="Daily Lead Limit" type="number" />
│         ├─> <TextField name="maxPricePerLead" label="Max Price per Lead" type="number" />
│         ├─> <TextField name="priority" label="Priority (1-10)" type="number" />
│         │
│         └─> <DialogActions>
│             ├─> <Button onClick={closeModal}>Cancel</Button>
│             └─> <Button type="submit" variant="contained">Add Buyer</Button>
│
└─> Buyer Detail Drawer
    └─> <Drawer anchor="right" open={drawerOpen}>
        ├─> Buyer Information
        │   - Name, Email, Phone, Company
        │   - Status, Priority, Wallet Balance
        │
        ├─> Criteria Sets
        │   └─> <Accordion>
        │       {buyer.criteriaSets.map(cs => (
        │         <AccordionItem>
        │           ├─> Criteria name
        │           ├─> Industries: {cs.industries.join(', ')}
        │           ├─> Locations: {cs.locations.length}
        │           ├─> Max Price: ${cs.maxPrice}
        │           ├─> Daily Limit: {cs.dailyLimit}
        │           └─> Active: {cs._id === buyer.activeCriteriaSetId ? 'Yes' : 'No'}
        │         </AccordionItem>
        │       ))}
        │
        ├─> Purchase History
        │   └─> <List>
        │       {buyer.purchaseHistory.map(p => (
        │         <ListItem>
        │           <ListItemText
        │             primary={`Lead: ${p.leadId}`}
        │             secondary={`${p.amount} units • ${formatDate(p.date)}`}
        │           />
        │         </ListItem>
        │       ))}
        │
        ├─> Activity Timeline
        │   - Registration date
        │   - Last login
        │   - Recent purchases
        │   - Lead acceptances/rejections
        │
        └─> Actions
            ├─> <Button onClick={sendMessage}>Send Message</Button>
            ├─> <Button onClick={adjustBalance}>Adjust Balance</Button>
            └─> <Button onClick={deactivateBuyer} color="error">Deactivate</Button>
```

---

#### Campaigns

**File**: `app/dashboard/seller/campaigns/campagincomponent.tsx`

**Component Structure**:

```
<CampaignsPage>
│
├─> Campaign Type Tabs
│   └─> <Tabs value={activeTab} onChange={setActiveTab}>
│       ├─> <Tab label="Email Campaigns" value="email" />
│       ├─> <Tab label="SMS Campaigns" value="sms" />
│       └─> <Tab label="All Campaigns" value="all" />
│
├─> {activeTab === 'email' && (
│   │   <EmailCampaignsSection>
│   │     ├─> <Button onClick={createEmailCampaign}>Create Email Campaign</Button>
│   │     │
│   │     └─> <Grid container spacing={2}>
│   │         {emailCampaigns.map(campaign => (
│   │           <Grid item xs={12} md={6} key={campaign._id}>
│   │             <CampaignCard campaign={campaign}>
│   │               ├─> <Typography variant="h6">{campaign.name}</Typography>
│   │               ├─> <Chip label={campaign.status} />
│   │               ├─> <Typography>Recipients: {campaign.recipients.length}</Typography>
│   │               ├─> <Typography>Sent: {campaign.sentCount}</Typography>
│   │               ├─> <Typography>Opened: {campaign.openRate}%</Typography>
│   │               ├─> <Typography>Clicked: {campaign.clickRate}%</Typography>
│   │               │
│   │               └─> <CardActions>
│   │                   ├─> <Button onClick={viewStats}>View Stats</Button>
│   │                   ├─> <Button onClick={editCampaign}>Edit</Button>
│   │                   ├─> {campaign.status === 'draft' && (
│   │                   │     <Button onClick={sendCampaign}>Send Now</Button>
│   │                   │   )}
│   │                   └─> <Button onClick={deleteCampaign} color="error">Delete</Button>
│   │             </CampaignCard>
│   │           </Grid>
│   │         ))}
│   │       </Grid>
│   │   </EmailCampaignsSection>
│   )}
│
├─> Email Campaign Builder Modal
│   └─> <Dialog open={emailBuilderOpen} fullScreen>
│       ├─> <AppBar>
│       │     <Toolbar>
│       │       <Typography variant="h6">Email Campaign Builder</Typography>
│       │       <Box sx={{ flexGrow: 1 }} />
│       │       <Button onClick={saveDraft}>Save Draft</Button>
│       │       <Button onClick={sendCampaign} variant="contained">Send</Button>
│       │     </Toolbar>
│       │   </AppBar>
│       │
│       ├─> <Grid container>
│       │   │
│       │   ├─> Settings Panel (Left - 30%)
│       │   │   └─> <Box sx={{ p: 2 }}>
│       │   │       ├─> <TextField label="Campaign Name" />
│       │   │       ├─> <TextField label="Subject Line" />
│       │   │       ├─> <TextField label="Preview Text" />
│       │   │       ├─> <TextField label="From Name" />
│       │   │       ├─> <TextField label="From Email" />
│       │   │       │
│       │   │       ├─> <Typography>Recipients</Typography>
│       │   │       ├─> <Select label="Recipient List">
│       │   │       │     <MenuItem value="all_buyers">All Buyers</MenuItem>
│       │   │       │     <MenuItem value="active_buyers">Active Buyers Only</MenuItem>
│       │   │       │     <MenuItem value="custom">Custom Selection</MenuItem>
│       │   │       │   </Select>
│       │   │       │
│       │   │       ├─> {recipientList === 'custom' && (
│       │   │       │     <Autocomplete
│       │   │       │       multiple
│       │   │       │       options={buyers}
│       │   │       │       getOptionLabel={(b) => b.email}
│       │   │       │       renderInput={(params) => (
│       │   │       │         <TextField {...params} label="Select Buyers" />
│       │   │       │       )}
│       │   │       │     />
│       │   │       │   )}
│       │   │       │
│       │   │       └─> <Button onClick={sendTestEmail}>Send Test Email</Button>
│       │   │
│       │   ├─> Email Editor (Center - 50%)
│       │   │   └─> <EmailEditorComponent>
│       │   │       - Rich text editor (Quill / TinyMCE)
│       │   │       - Template variables: {{buyerName}}, {{companyName}}
│       │   │       - Image upload
│       │   │       - Link insertion
│       │   │       - Styling toolbar
│       │   │
│       │   └─> Preview Panel (Right - 20%)
│       │       └─> <Box>
│       │           ├─> <ToggleButtonGroup>
│       │           │     <ToggleButton value="desktop">Desktop</ToggleButton>
│       │           │     <ToggleButton value="mobile">Mobile</ToggleButton>
│       │           │   </ToggleButtonGroup>
│       │           │
│       │           └─> <EmailPreview
│       │               html={emailHtml}
│       │               viewMode={previewMode}
│       │             />
│       │
│       └─> Confirmation Dialog
│           └─> <Dialog open={confirmSendOpen}>
│               <DialogTitle>Send Campaign?</DialogTitle>
│               <DialogContent>
│                 <Typography>
│                   Send to {recipients.length} recipients?
│                 </Typography>
│                 <Typography variant="caption">
│                   This action cannot be undone.
│                 </Typography>
│               </DialogContent>
│               <DialogActions>
│                 <Button onClick={cancelSend}>Cancel</Button>
│                 <Button onClick={confirmSend} variant="contained">
│                   Send Now
│                 </Button>
│               </DialogActions>
│
├─> SMS Campaign Section (similar structure)
│   - Character counter (160 chars per SMS)
│   - Template variables
│   - Preview panel
│   - Send test SMS
│
└─> Campaign Analytics Modal
    └─> <Dialog open={analyticsOpen} maxWidth="lg">
        ├─> Summary Cards
        │   ├─> Sent: {campaign.sentCount}
        │   ├─> Delivered: {campaign.deliveredCount}
        │   ├─> Opened: {campaign.openedCount} ({campaign.openRate}%)
        │   ├─> Clicked: {campaign.clickedCount} ({campaign.clickRate}%)
        │   └─> Bounced: {campaign.bouncedCount}
        │
        ├─> Charts
        │   ├─> <LineChart data={openRateOverTime} />
        │   └─> <PieChart data={recipientStatus} />
        │
        └─> Recipient Details Table
            - Name, Email, Status (sent/opened/clicked/bounced)
            - Timestamp for each action
```

---

### B. Buyer Dashboard Components

#### Navigation Structure

```
app/dashboard/buyer/layout.tsx
│
└─> <UserDashboard userRole="buyer">
    ├─> Sidebar Navigation
    │   ├─> Overview
    │   ├─> Marketplace (Browse Leads)
    │   ├─> My Leads (Purchased & Assigned)
    │   ├─> Purchase Units
    │   ├─> Criteria Sets
    │   ├─> Settings
    │   └─> Help
    │
    ├─> Top Bar
    │   ├─> Wallet Balance: {walletUnit} units
    │   ├─> Notifications
    │   └─> User Menu
    │
    └─> Main Content Area
```

---

#### Marketplace

**File**: `app/dashboard/buyer/marketplace/page.tsx`

**Component Structure**:

```
<MarketplacePage>
│
├─> Filters Section
│   └─> <Grid container spacing={2}>
│       ├─> <Autocomplete
│       │     multiple
│       │     options={industries}
│       │     renderInput={(params) => <TextField {...params} label="Industries" />}
│       │   />
│       ├─> <Autocomplete
│       │     options={states}
│       │     renderInput={(params) => <TextField {...params} label="State" />}
│       │   />
│       ├─> <Slider
│       │     label="Max Price (units)"
│       │     min={0}
│       │     max={200}
│       │     onChange={setPriceFilter}
│       │   />
│       ├─> <Slider
│       │     label="Minimum Lead Score"
│       │     min={0}
│       │     max={10}
│       │     onChange={setScoreFilter}
│       │   />
│       └─> <Button onClick={clearFilters}>Clear All</Button>
│
├─> Sort Options
│   └─> <Select value={sortBy} onChange={setSortBy}>
│       <MenuItem value="newest">Newest First</MenuItem>
│       <MenuItem value="score">Lead Score (High to Low)</MenuItem>
│       <MenuItem value="price_low">Price (Low to High)</MenuItem>
│       <MenuItem value="price_high">Price (High to Low)</MenuItem>
│     </Select>
│
├─> Available Leads Grid
│   └─> <Grid container spacing={2}>
│       {availableLeads.map(lead => (
│         <Grid item xs={12} sm={6} md={4} key={lead._id}>
│           <LeadCard lead={lead} variant="marketplace">
│             ├─> <CardHeader
│             │     avatar={<Avatar>{lead.industry[0]}</Avatar>}
│             │     title={lead.name}
│             │     subheader={lead.company}
│             │   />
│             │
│             ├─> <CardContent>
│             │   ├─> <Box>
│             │   │     <Rating value={lead.leadScore} readOnly />
│             │   │     <Typography variant="caption">
│             │   │       Lead Score: {lead.leadScore}/10
│             │   │     </Typography>
│             │   │   </Box>
│             │   │
│             │   ├─> <Chip label={lead.industry} size="small" />
│             │   ├─> <Typography>
│             │   │     <LocationIcon /> {lead.location.city}, {lead.location.state}
│             │   │   </Typography>
│             │   │
│             │   ├─> <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
│             │   │     <MoneyIcon />
│             │   │     <Typography variant="h6">{lead.unit} units</Typography>
│             │   │   </Box>
│             │   │
│             │   └─> <Typography variant="caption" color="text.secondary">
│             │       Posted {formatRelativeTime(lead.createdAt)}
│             │     </Typography>
│             │
│             └─> <CardActions>
│                 ├─> <Button onClick={() => viewLeadPreview(lead._id)}>
│                 │     View Details
│                 │   </Button>
│                 │
│                 └─> <Button
│                     variant="contained"
│                     onClick={() => purchaseLead(lead._id)}
│                     disabled={buyer.walletUnit < lead.unit}
│                   >
│                     {buyer.walletUnit < lead.unit ? 'Insufficient Units' : 'Purchase'}
│                   </Button>
│           </LeadCard>
│         </Grid>
│       ))}
│     </Grid>
│
├─> Lead Preview Modal
│   └─> <Dialog open={previewOpen}>
│       ├─> <DialogTitle>Lead Preview</DialogTitle>
│       │
│       ├─> <DialogContent>
│       │   ├─> Partial Information (before purchase)
│       │   │   - Name: {lead.name}
│       │   │   - Company: {lead.company}
│       │   │   - Industry: {lead.industry}
│       │   │   - Location: {lead.location.city}, {lead.location.state}
│       │   │   - Lead Score: {lead.leadScore}/10
│       │   │
│       │   ├─> Scoring Breakdown
│       │   │   └─> <ScoreChart data={lead.scoreFactors} />
│       │   │
│       │   ├─> Price: {lead.unit} units
│       │   │
│       │   └─> <Alert severity="info">
│       │       Contact details will be revealed after purchase
│       │     </Alert>
│       │
│       └─> <DialogActions>
│           ├─> <Button onClick={closePreview}>Cancel</Button>
│           └─> <Button variant="contained" onClick={confirmPurchase}>
│               Purchase Lead
│             </Button>
│
└─> Purchase Confirmation Modal
    └─> <Dialog open={confirmPurchaseOpen}>
        ├─> <DialogTitle>Confirm Purchase</DialogTitle>
        ├─> <DialogContent>
        │   <Typography>
        │     Purchase lead for {lead.unit} units?
        │   </Typography>
        │   <Typography variant="caption">
        │     Your balance: {buyer.walletUnit} units
        │   </Typography>
        │   <Typography variant="caption">
        │     New balance: {buyer.walletUnit - lead.unit} units
        │   </Typography>
        │ </DialogContent>
        │
        └─> <DialogActions>
            ├─> <Button onClick={cancelPurchase}>Cancel</Button>
            └─> <Button
                variant="contained"
                onClick={handlePurchase}
                disabled={purchasing}
              >
                {purchasing ? <CircularProgress size={20} /> : 'Confirm Purchase'}
              </Button>
```

**Purchase Flow**:

```typescript
const handlePurchase = async (leadId: string) => {
  try {
    setPurchasing(true);

    const response = await fetch("/api/leads/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId }),
    });

    const result = await response.json();

    if (result.success) {
      // Update local buyer state
      dispatch(updateWalletBalance(result.data.newBalance));
      dispatch(addPurchasedLead(result.data.lead));

      // Remove from marketplace
      setAvailableLeads((prev) => prev.filter((l) => l._id !== leadId));

      // Show success message
      toast.success("Lead purchased successfully!");

      // Redirect to lead details
      router.push(`/dashboard/buyer/leads/${leadId}`);
    } else {
      toast.error(result.error || "Purchase failed");
    }
  } catch (error) {
    toast.error("Failed to purchase lead");
  } finally {
    setPurchasing(false);
    setConfirmPurchaseOpen(false);
  }
};
```

---

#### My Leads

**File**: `app/dashboard/buyer/myleads/page.tsx`

**Tabs Structure**:

```
<MyLeadsPage>
│
├─> <Tabs value={activeTab}>
│   ├─> <Tab label="Purchased Leads" value="purchased" />
│   └─> <Tab label="Assigned to Me" value="assigned" />
│
├─> {activeTab === 'purchased' && (
│   │   <PurchasedLeadsSection>
│   │     - Full access to lead details
│   │     - Contact information visible
│   │     - Actions: Call, Email, Add Notes, Mark as Contacted
│   │   </PurchasedLeadsSection>
│   )}
│
├─> {activeTab === 'assigned' && (
│   │   <AssignedLeadsSection>
│   │     └─> {assignedLeads.map(lead => (
│   │         <AssignedLeadCard lead={lead}>
│   │           ├─> Lead Preview
│   │           ├─> Price: {lead.unit} units
│   │           ├─> Expires: {formatRelativeTime(lead.assignedTo.expiresAt)}
│   │           │
│   │           └─> <CardActions>
│   │               ├─> <Button
│   │               │     variant="contained"
│   │               │     color="success"
│   │               │     onClick={() => acceptLead(lead._id)}
│   │               │   >
│   │               │     Accept Lead
│   │               │   </Button>
│   │               │
│   │               └─> <Button
│   │                   variant="outlined"
│   │                   color="error"
│   │                   onClick={() => rejectLead(lead._id)}
│   │                 >
│   │                   Reject Lead
│   │                 </Button>
│   │         </AssignedLeadCard>
│   │       ))}
│   │   </AssignedLeadsSection>
│   )}
│
└─> Lead Detail Page
    └─> <LeadDetailsPage leadId={selectedLeadId}>
        ├─> Contact Information
        │   - Name, Email, Phone (clickable to call/email)
        │   - Company, Industry
        │   - Address
        │
        ├─> Lead Details
        │   - All form submission data
        │   - Lead score breakdown
        │   - Source information
        │   - Submission timestamp
        │
        ├─> Communication History
        │   └─> <Timeline>
        │       - Calls made (if call tracking enabled)
        │       - Emails sent
        │       - Notes added
        │       - Status changes
        │
        ├─> Notes Section
        │   - Add private notes
        │   - Timestamped note history
        │
        └─> Actions
            ├─> <Button onClick={callLead}>
            │     <PhoneIcon /> Call Lead
            │   </Button>
            ├─> <Button onClick={emailLead}>
            │     <EmailIcon /> Send Email
            │   </Button>
            ├─> <Select label="Status" onChange={updateStatus}>
            │     <MenuItem value="contacted">Contacted</MenuItem>
            │     <MenuItem value="qualified">Qualified</MenuItem>
            │     <MenuItem value="not_interested">Not Interested</MenuItem>
            │     <MenuItem value="converted">Converted</MenuItem>
            │   </Select>
            └─> <Button onClick={exportLead}>
                <DownloadIcon /> Export as vCard
              </Button>
```

---

#### Criteria Sets

**File**: `app/dashboard/buyer/criteriasets/page.tsx`

**Component Structure**:

```
<CriteriaSetsPage>
│
├─> Active Criteria Indicator
│   └─> <Alert severity="info">
│       {activeCriteriaSet ? (
│         <>
│           Active Criteria: <strong>{activeCriteriaSet.name}</strong>
│           {activeCriteriaSet.autoAccept && (
│             <Chip label="Auto-Accept Enabled" color="success" size="small" />
│           )}
│         </>
│       ) : (
│         'No active criteria set. Leads will not auto-match.'
│       )}
│     </Alert>
│
├─> Criteria Sets List
│   └─> <Grid container spacing={2}>
│       {criteriaSets.map(cs => (
│         <Grid item xs={12} md={6} key={cs._id}>
│           <CriteriaSetCard criteriaSet={cs}>
│             ├─> <CardHeader
│             │     title={cs.name}
│             │     action={
│             │       <Switch
│             │         checked={cs._id === activeCriteriaSetId}
│             │         onChange={() => toggleActive(cs._id)}
│             │         label="Active"
│             │       />
│             │     }
│             │   />
│             │
│             ├─> <CardContent>
│             │   ├─> Lead Types
│             │   │   {cs.leadTypes.map(type => (
│             │   │     <Chip label={type} size="small" />
│             │   │   ))}
│             │   │
│             │   ├─> Industries ({cs.industries.length})
│             │   │   {cs.industries.slice(0, 3).map(ind => (
│             │   │     <Chip label={ind} size="small" />
│             │   │   ))}
│             │   │   {cs.industries.length > 3 && (
│             │   │     <Chip label={`+${cs.industries.length - 3} more`} />
│             │   │   )}
│             │   │
│             │   ├─> Locations ({cs.locations.length})
│             │   │   - States: {cs.locations.map(l => l.state).join(', ')}
│             │   │
│             │   ├─> Max Price: {cs.maxPrice} units
│             │   ├─> Daily Limit: {cs.dailyLimit} leads/day
│             │   │
│             │   └─> <FormControlLabel
│             │       control={<Switch checked={cs.autoAccept} />}
│             │       label="Auto-Accept Matching Leads"
│             │     />
│             │
│             └─> <CardActions>
│                 ├─> <Button onClick={() => editCriteria(cs._id)}>Edit</Button>
│                 ├─> <Button onClick={() => duplicateCriteria(cs._id)}>Duplicate</Button>
│                 └─> <Button color="error" onClick={() => deleteCriteria(cs._id)}>
│                     Delete
│                   </Button>
│           </CriteriaSetCard>
│         </Grid>
│       ))}
│
│       <Grid item xs={12} md={6}>
│         <Card sx={{ border: '2px dashed', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
│           <Button
│             variant="contained"
│             startIcon={<AddIcon />}
│             onClick={openCreateModal}
│           >
│             Create New Criteria Set
│           </Button>
│         </Card>
│       </Grid>
│     </Grid>
│
└─> Criteria Editor Modal
    └─> <Dialog open={editorOpen} maxWidth="md" fullWidth>
        <form onSubmit={handleSaveCriteria}>
          ├─> <TextField
          │     name="name"
          │     label="Criteria Set Name"
          │     required
          │   />
          │
          ├─> Lead Types
          │   └─> <FormGroup>
          │       <FormControlLabel control={<Checkbox name="leadTypes" value="exclusive" />} label="Exclusive Leads" />
          │       <FormControlLabel control={<Checkbox name="leadTypes" value="shared" />} label="Shared Leads" />
          │     </FormGroup>
          │
          ├─> Industries
          │   └─> <Autocomplete
          │       multiple
          │       options={industryOptions}
          │       value={selectedIndustries}
          │       onChange={(e, value) => setSelectedIndustries(value)}
          │       renderInput={(params) => <TextField {...params} label="Industries" />}
          │     />
          │
          ├─> Locations
          │   └─> <LocationSelector>
          │       {locations.map((loc, index) => (
          │         <Box key={index}>
          │           <Grid container spacing={2}>
          │             <Grid item xs={5}>
          │               <Select label="State" value={loc.state} onChange={...}>
          │                 {stateOptions.map(s => <MenuItem value={s}>{s}</MenuItem>)}
          │               </Select>
          │             </Grid>
          │             <Grid item xs={5}>
          │               <Autocomplete
          │                 options={getCitiesForState(loc.state)}
          │                 value={loc.city}
          │                 renderInput={(params) => <TextField {...params} label="City (optional)" />}
          │               />
          │             </Grid>
          │             <Grid item xs={2}>
          │               <IconButton onClick={() => removeLocation(index)}>
          │                 <DeleteIcon />
          │               </IconButton>
          │             </Grid>
          │           </Grid>
          │           <TextField
          │             label="Service Radius (miles)"
          │             type="number"
          │             value={loc.radius}
          │             onChange={...}
          │           />
          │         </Box>
          │       ))}
          │       <Button onClick={addLocation}>+ Add Location</Button>
          │     </LocationSelector>
          │
          ├─> Price & Limits
          │   ├─> <TextField
          │   │     name="maxPrice"
          │   │     label="Maximum Price per Lead (units)"
          │   │     type="number"
          │   │   />
          │   └─> <TextField
          │       name="dailyLimit"
          │       label="Daily Lead Limit"
          │       type="number"
          │     />
          │
          ├─> Excluded Sources (optional)
          │   └─> <Autocomplete
          │       multiple
          │       freeSolo
          │       options={knownSources}
          │       value={excludedSources}
          │       renderInput={(params) => <TextField {...params} label="Exclude Lead Sources" />}
          │     />
          │
          ├─> Auto-Accept
          │   └─> <FormControlLabel
          │       control={<Switch name="autoAccept" />}
          │       label="Automatically purchase leads matching this criteria"
          │     />
          │   <Alert severity="warning">
          │     Ensure you have sufficient units in your wallet for auto-purchasing
          │   </Alert>
          │
          └─> <DialogActions>
              ├─> <Button onClick={closeEditor}>Cancel</Button>
              └─> <Button type="submit" variant="contained">Save Criteria Set</Button>
        </form>
```

---

### C. Admin Dashboard Components

**File**: `app/admindashboard/page.tsx`

**Component Overview**:

```
<AdminDashboard>
│
├─> Platform Statistics
│   └─> <Grid container spacing={2}>
│       ├─> Total Users: {stats.totalUsers}
│       ├─> Total Leads: {stats.totalLeads}
│       ├─> Total Transactions: {stats.totalTransactions}
│       ├─> Platform Revenue: ${stats.revenue}
│       └─> Active Subscriptions: {stats.activeSubscriptions}
│
├─> User Management Tab
│   └─> <DataGrid
│       rows={users}
│       columns={[
│         'Name', 'Email', 'Role', 'Status', 'Subscription', 'Created', 'Actions'
│       ]}
│     />
│   Actions:
│   - View user details
│   - Change role (seller/buyer/admin)
│   - Suspend/Activate user
│   - Reset password
│   - Delete user
│
├─> Tier Management
│   └─> Manage subscription tiers
│       - Create/Edit/Delete tiers
│       - Set pricing and limits
│       - Define features
│
├─> Transaction Monitoring
│   - View all transactions
│   - Refund transactions
│   - Export financial reports
│
├─> System Health
│   - Database status
│   - Redis cache status
│   - API error rates
│   - Performance metrics
│
└─> Audit Logs
    - User actions log
    - System events
    - Security alerts
```

---

## 2. TECHNICAL FEATURES

### A. Authentication & Authorization

#### NextAuth Configuration

**File**: `auth.ts`

```typescript
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await dbConnect();

        const user = await User.findOne({ email: credentials.email });

        if (!user) {
          throw new Error("No user found");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // Handle session updates
      if (trigger === "update" && session) {
        token.name = session.name;
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }

      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
```

#### Protected Route Wrapper

**File**: `app/components/ProtectedRoute.tsx`

```typescript
export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }

    if (session && !allowedRoles.includes(session.user.role)) {
      router.push("/unauthorized");
    }
  }, [status, session]);

  if (status === "loading") {
    return <LoadingSpinner />;
  }

  if (!session || !allowedRoles.includes(session.user.role)) {
    return null;
  }

  return <>{children}</>;
}
```

---

### B. Caching Strategy

#### Redis Cache Implementation

**File**: `lib/cache.ts`

```typescript
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    return cached as T;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

export async function setCachedData<T>(
  key: string,
  data: T,
  ttlSeconds: number = 3600,
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(data), {
      ex: ttlSeconds,
    });
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
}

// Usage in API routes
export async function GET(req: NextRequest) {
  const userId = req.headers.get("user-id");
  const cacheKey = `user:${userId}:stats`;

  // Try cache first
  const cached = await getCachedData(cacheKey);
  if (cached) {
    return NextResponse.json({ success: true, data: cached });
  }

  // Fetch from database
  const stats = await fetchUserStats(userId);

  // Cache for 5 minutes
  await setCachedData(cacheKey, stats, 300);

  return NextResponse.json({ success: true, data: stats });
}
```

#### Cache Invalidation Strategy

```
User updates profile → invalidate("user:{userId}:*")
Lead created → invalidate("leads:available:*")
Transaction completed → invalidate("user:{userId}:wallet", "user:{userId}:stats")
Subscription changed → invalidate("user:{userId}:subscription")
```

---

### C. Real-time Features

#### WebSocket Setup

**File**: `lib/websocket/server.ts`

```typescript
import { Server as SocketIOServer } from "socket.io";

export function initWebSocket(server: any) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_FRONTEND_URL,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join user-specific room
    socket.on("join", (userId: string) => {
      socket.join(`user:${userId}`);
    });

    // Join seller's lead room
    socket.on("join-seller-leads", (sellerId: string) => {
      socket.join(`seller:${sellerId}:leads`);
    });

    // Join buyer's marketplace room
    socket.on("join-marketplace", (buyerId: string) => {
      socket.join("marketplace");
      socket.join(`buyer:${buyerId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
}

// Emit events from API routes
export async function notifyNewLead(sellerId: string, lead: any) {
  const io = getIO(); // Get IO instance
  io.to(`seller:${sellerId}:leads`).emit("new-lead", lead);
  io.to("marketplace").emit("marketplace-update", { leadId: lead._id });
}
```

#### Client-side WebSocket

**File**: `app/hooks/useWebSocket.ts`

```typescript
import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

export function useWebSocket() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      console.log("WebSocket connected");
      newSocket.emit("join", session.user.id);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [session]);

  return socket;
}

// Usage in components
function LeadManagement() {
  const socket = useWebSocket();
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    if (!socket) return;

    socket.on("new-lead", (lead) => {
      setLeads((prev) => [lead, ...prev]);
      toast.info("New lead received!");
    });

    return () => {
      socket.off("new-lead");
    };
  }, [socket]);
}
```

---

### D. Error Handling

#### Global Error Boundary

**File**: `app/components/ErrorBoundary.tsx`

```typescript
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    // Log to error tracking service (Sentry, etc.)
    logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h4">Something went wrong</Typography>
          <Typography color="text.secondary">
            {this.state.error?.message}
          </Typography>
          <Button
            onClick={() => this.setState({ hasError: false })}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
```

#### API Error Responses

**File**: `lib/apiHelpers.ts`

```typescript
export function errorResponse(
  error: any,
  statusCode: number = 500,
): NextResponse {
  console.error("API Error:", error);

  const message = error.message || "Internal server error";

  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(process.env.NODE_ENV === "development" && {
        stack: error.stack,
      }),
    },
    { status: statusCode },
  );
}

export function successResponse(data: any, message?: string): NextResponse {
  return NextResponse.json({
    success: true,
    ...(message && { message }),
    data,
  });
}
```

---

### E. Security Features

#### CSRF Protection

**File**: `csrfMiddleware.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export function csrfProtection(req: NextRequest) {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return NextResponse.next();
  }

  const csrfToken = req.headers.get("x-csrf-token");
  const cookieToken = req.cookies.get("csrf-token")?.value;

  if (!csrfToken || csrfToken !== cookieToken) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  return NextResponse.next();
}

// Generate CSRF token
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
```

#### Input Validation

**File**: `lib/validation.ts`

```typescript
import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  company: z.string().max(200).optional(),
  industry: z.enum([
    "real_estate",
    "insurance",
    "solar",
    "home_services",
    "other",
  ]),
  fields: z.array(
    z.object({
      label: z.string(),
      value: z.any(),
    }),
  ),
});

export const buyerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  industries: z.array(z.string()).min(1),
  serviceLocations: z.array(
    z.object({
      state: z.string().length(2),
      city: z.string().optional(),
      radius: z.number().positive().optional(),
    }),
  ),
  maxLeadsPerDay: z.number().int().positive(),
  maxPricePerLead: z.number().positive(),
});

// Usage in API routes
export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const validatedData = leadSchema.parse(body);
    // Proceed with validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }
  }
}
```

#### Rate Limiting

**File**: `middleware.ts`

```typescript
import rateLimit from "express-rate-limit";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later",
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  message: "Too many login attempts",
});

// Apply to specific routes
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/auth")) {
    return authLimiter(req);
  }

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return apiLimiter(req);
  }
}
```

---

## 3. DEPLOYMENT ARCHITECTURE

### A. Production Environment Setup

#### Environment Variables

**File**: `.env.production`

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://brixcot.com
NEXT_PUBLIC_WS_URL=wss://ws.brixcot.com

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/brixcot?retryWrites=true&w=majority
MONGODB_DB=brixcot_production

# Redis Cache
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# Authentication
NEXTAUTH_URL=https://brixcot.com
NEXTAUTH_SECRET=production_secret_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=your_live_client_id
PAYPAL_CLIENT_SECRET=your_live_secret

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
EMAIL_FROM=noreply@brixcot.com

# Integrations
HUBSPOT_CLIENT_ID=your_hubspot_client_id
HUBSPOT_CLIENT_SECRET=your_hubspot_secret
SALESFORCE_CLIENT_ID=your_sf_client_id
SALESFORCE_CLIENT_SECRET=your_sf_secret

# Security
ENCRYPTION_KEY=32_byte_hex_key_here
CSRF_SECRET=random_secret_here
```

---

### B. Deployment Options

#### Option 1: Vercel (Recommended)

**Setup**:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**vercel.json** configuration:

```json
{
  "buildCommand": "next build",
  "devCommand": "next dev --turbopack",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "MONGODB_URI": "@mongodb_uri",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "STRIPE_SECRET_KEY": "@stripe_secret_key"
  },
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

**Pros**:

- Zero-config deployment
- Automatic HTTPS
- Global CDN
- Serverless functions auto-scaling
- Built-in analytics

**Cons**:

- Serverless function limitations (10s timeout on hobby plan)
- Cold starts
- WebSocket support requires separate service

---

#### Option 2: AWS (Full Control)

**Architecture**:

```
┌─────────────────────────────────────────┐
│           CloudFront (CDN)              │
│   - Static assets caching              │
│   - HTTPS/SSL termination              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    Application Load Balancer (ALB)     │
│   - Health checks                       │
│   - SSL certificates                    │
└──────────────┬──────────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
┌─────▼─────┐    ┌──────▼──────┐
│  ECS/EC2  │    │  ECS/EC2    │
│  Instance │    │  Instance   │
│  (Node.js)│    │  (Node.js)  │
└───────────┘    └─────────────┘
      │                 │
      └────────┬────────┘
               │
┌──────────────▼──────────────────────────┐
│         MongoDB Atlas                   │
│   - Replica set                         │
│   - Automatic backups                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Redis (ElastiCache)             │
│   - In-memory caching                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│              S3 Buckets                 │
│   - User uploads                        │
│   - Static assets                       │
└─────────────────────────────────────────┘
```

**Dockerfile**:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**docker-compose.yml** (for local testing):

```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - redis
      - mongodb

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mongodb_data:
  redis_data:
```

---

#### Option 3: DigitalOcean App Platform

**app.yaml**:

```yaml
name: brixcot-lead-gen
region: nyc
services:
  - name: web
    github:
      repo: your-username/lead-gen-app
      branch: main
      deploy_on_push: true
    build_command: npm run build
    run_command: npm start
    environment_slug: node-js
    instance_count: 2
    instance_size_slug: professional-xs
    http_port: 3000
    envs:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        value: ${mongodb.DATABASE_URL}
        type: SECRET
      - key: NEXTAUTH_SECRET
        value: ${NEXTAUTH_SECRET}
        type: SECRET
    health_check:
      http_path: /api/health

databases:
  - name: mongodb
    engine: MONGODB
    version: "7"
    size: db-s-1vcpu-1gb
```

---

### C. CI/CD Pipeline

#### GitHub Actions Workflow

**File**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_APP_URL: https://brixcot.com

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"

      - name: Run database migrations
        run: npm run migrate
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} \
            --paths "/*"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: "Deployment to production completed"
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

### D. Monitoring & Observability

#### Health Check Endpoint

**File**: `app/api/health/route.ts`

```typescript
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbconnect";
import { redis } from "@/lib/cache";

export async function GET() {
  const checks = {
    database: false,
    cache: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Check database
    await dbConnect();
    checks.database = true;
  } catch (error) {
    console.error("Database health check failed:", error);
  }

  try {
    // Check Redis
    await redis.ping();
    checks.cache = true;
  } catch (error) {
    console.error("Cache health check failed:", error);
  }

  const healthy = checks.database && checks.cache;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "unhealthy",
      checks,
    },
    { status: healthy ? 200 : 503 },
  );
}
```

#### Performance Monitoring

**Integration with Vercel Analytics or New Relic**

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: Props) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

### E. Database Optimization

#### Indexes

**File**: `models/Lead.ts`

```typescript
LeadSchema.index({ userId: 1, status: 1 });
LeadSchema.index({ industry: 1, "location.state": 1 });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ leadScore: -1 });
LeadSchema.index({ qualificationScore: -1 });
LeadSchema.index({ "assignedTo.buyerId": 1 });
```

#### Connection Pooling

**File**: `lib/db/dbconnect.ts`

```typescript
const options = {
  maxPoolSize: 10,
  minPoolSize: 5,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
  w: "majority",
};

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI!, options)
      .then((mongoose) => {
        return mongoose;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
```

---

### F. Backup & Disaster Recovery

#### Automated Backups

```bash
# MongoDB backup script (cron job)
#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"

mongodump --uri="${MONGODB_URI}" --out="${BACKUP_DIR}/${DATE}"

# Upload to S3
aws s3 sync ${BACKUP_DIR}/${DATE} s3://brixcot-backups/mongodb/${DATE}/

# Delete local backup older than 7 days
find ${BACKUP_DIR} -type d -mtime +7 -exec rm -rf {} \;

# Verify backup
if [ $? -eq 0 ]; then
  echo "Backup successful: ${DATE}"
else
  echo "Backup failed: ${DATE}" | mail -s "Backup Failed" admin@brixcot.com
fi
```

#### Restore Procedure

```bash
# Restore from backup
mongorestore --uri="${MONGODB_URI}" --drop /path/to/backup

# Or from S3
aws s3 sync s3://brixcot-backups/mongodb/20240115_120000/ /tmp/restore/
mongorestore --uri="${MONGODB_URI}" --drop /tmp/restore/
```

---

## 4. PERFORMANCE OPTIMIZATIONS

### A. Code Splitting & Lazy Loading

```typescript
// Dynamic imports for heavy components
const FormBuilder = dynamic(() => import('@/app/components/FormBuilder'), {
  loading: () => <Skeleton variant="rectangular" height={400} />,
  ssr: false
});

const EmailCampaignBuilder = dynamic(() => import('@/app/components/EmailCampaignBuilder'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});
```

### B. Image Optimization

```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="BRIXCOT Logo"
  width={200}
  height={50}
  priority
  placeholder="blur"
  blurDataURL="/logo-blur.png"
/>
```

### C. Database Query Optimization

```typescript
// Efficient aggregation pipeline
const stats = await Lead.aggregate([
  { $match: { userId: sellerId } },
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 },
      totalValue: { $sum: "$unit" },
    },
  },
  {
    $project: {
      status: "$_id",
      count: 1,
      totalValue: 1,
      _id: 0,
    },
  },
]);
```

---

**End of Document 3**

---

## SUMMARY OF ALL 3 DOCUMENTS

**Document 1**: System Architecture & Data Models

- Application overview
- Tech stack
- User roles
- Database schemas
- API routes

**Document 2**: Business Workflows & Integrations

- Lead generation flow
- Distribution methods
- Payment processing
- Subscription management
- Integration capabilities

**Document 3** (This Document): Component Structure & Deployment

- Dashboard components (Seller, Buyer, Admin)
- Technical features (auth, caching, real-time)
- Security implementations
- Deployment architectures
- Performance optimizations

**For complete understanding, refer to all 3 documents together.**
