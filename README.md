# Note3 - Web3 Note Taking App

A decentralized note-taking application built on 0G Storage, featuring blockchain-based data persistence and modern web technologies.

## ✨ Features

### Core Features
- **Decentralized Storage**: Notes are stored on 0G Storage (0G Chain)
- **Wallet Integration**: Connect with any Web3 wallet (MetaMask, WalletConnect, etc.)
- **Markdown Support**: Rich text editing with real-time preview
- **Real-time Preview**: See your Markdown content rendered as you type

### New Features (Latest Update)

#### 1. 📝 Note Editing & Version Control
- **Edit Existing Notes**: Click the "Edit Note" button on any note you own
- **Version History**: Track changes with automatic version numbering
- **Edit History**: View previous versions of your notes
- **Smart Updates**: Original note ID points to the latest version

#### 2. 🖼️ Image Support
- **Drag & Drop Upload**: Simply drag images into the editor
- **Multiple Formats**: Support for JPG, PNG, GIF, WebP (max 10MB each)
- **CID References**: Images are uploaded separately and referenced by CID
- **Markdown Integration**: Use `![alt](image-cid)` syntax in your notes
- **Image Gallery**: View all images in a dedicated section

#### 3. 🏷️ Organization & Categorization
- **Categories**: Organize notes by topic or project
- **Tags**: Add multiple tags for better searchability
- **Smart Filtering**: Filter notes by category, tag, or search query
- **Statistics Dashboard**: View counts of total notes, images, categories, and tags
- **Grid/List Views**: Toggle between different note display modes

#### 4. 🧠 Intelligent NFTs (INFTs)
- **ERC-7857 Standard**: Convert notes to Intelligent NFTs based on ERC-7857 standard
- **AI Capabilities**: Generate summaries and Q&A pairs for your notes
- **Smart Contracts**: Deploy and interact with Note3 INFT contracts on 0G Chain
- **Intelligence Configuration**: Customize AI capabilities, model versions, and compute requirements
- **Metadata Management**: Rich metadata including intelligence features and note references
- **INFT Management**: View, manage, and interact with your owned INFTs

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Web3 wallet (MetaMask, etc.)
- 0G testnet tokens for storage fees

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd note3
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Configure your `.env.local`:
   ```env
   NEXT_PUBLIC_OG_ENDPOINT=https://evmrpc-testnet.0g.ai/
   NEXT_PUBLIC_OG_INDEXER=https://indexer-storage-testnet-turbo.0g.ai
   NEXT_PUBLIC_OG_GATEWAY=https://gateway.0g.ai/ipfs/
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
   NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=0x52e82FeB652a67246eaB8Bd2Eb6cFe078C29b45f
   NEXT_PUBLIC_VERIFIER_CONTRACT_ADDRESS=0x1b55eb84F3F8b741D062Fa7aeE68a363884b4bd1
   ```

4. **Get testnet tokens**
   - Visit [0G Faucet](https://faucet.0g.ai/)
   - Request testnet 0G tokens for your wallet

5. **Run the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Connect your wallet
   - Start creating notes!

## 📖 Usage Guide

### Creating Notes

1. **Navigate to "New Note"**
   - Click the "New Note" button on the homepage
   - Or visit `/new` directly

2. **Fill in the details**
   - **Title**: Give your note a descriptive title
   - **Category**: Choose or create a category (e.g., "Work", "Personal", "Project X")
   - **Tags**: Add relevant tags separated by Enter key (e.g., "meeting", "ideas", "todo")
   - **Content**: Write your note in Markdown format

3. **Add Images**
   - **Drag & Drop**: Simply drag image files into the upload area
   - **Browse Files**: Click "Browse Files" to select images manually
   - **Supported Formats**: JPG, PNG, GIF, WebP (max 10MB each)
   - **Reference in Content**: Use `![alt](image-cid)` syntax to insert images

4. **Save Your Note**
   - Click "Save Note" to upload to 0G Storage
   - Your note will be stored on the blockchain
   - You'll be redirected to view your new note

### Editing Notes

1. **Access Edit Mode**
   - View any note you own
   - Click the "Edit Note" button (only visible to note authors)

2. **Make Changes**
   - Modify title, category, tags, or content
   - Add new images or reference existing ones
   - All changes are tracked with version history

3. **Save Changes**
   - Click "Update Note" to save your edits
   - A new version is created and linked to the original
   - The original note ID now points to the latest version

### Organizing & Finding Notes

1. **Use Categories**
   - Filter notes by category using the dropdown
   - Create new categories as you write notes
   - Categories are automatically saved for future use

2. **Apply Tags**
   - Filter by specific tags
   - Tags help with detailed organization
   - Use consistent naming for better searchability

3. **Search Functionality**
   - Search across titles, tags, and categories
   - Real-time search results
   - Combine search with filters for precise results

4. **View Modes**
   - **Grid View**: Card-based layout showing note previews
   - **List View**: Compact list format for quick scanning
   - Toggle between views using the view mode buttons

### Image Management

1. **Uploading Images**
   - Images are uploaded separately from notes
   - Each image gets a unique CID (Content Identifier)
   - Images are stored on 0G Storage for permanence

2. **Referencing Images**
   - Use the syntax: `![alt text](image-cid)`
   - Replace `image-cid` with the actual CID from your uploaded images
   - Images will render in the preview and final note

3. **Image Gallery**
   - View all images in a dedicated section
   - See image CIDs for reference
   - Images are displayed with fallback placeholders if loading fails

### INFT Management

1. **Converting Notes to INFTs**
   - Navigate to any note you own
   - Click "Convert to INFT" button
   - Configure intelligence settings (capabilities, model version, etc.)
   - Deploy the INFT to 0G Chain

2. **Managing INFTs**
   - View all your INFTs on the "My INFTs" page
   - Generate AI summaries for your INFTs
   - Add Q&A pairs to enhance intelligence
   - View detailed metadata and intelligence configuration

3. **Intelligence Features**
   - **Summary Generation**: AI-powered summaries of note content
   - **Q&A Pairs**: Add question-answer pairs for better understanding
   - **Custom Configuration**: Set memory requirements, compute units, and data sources
   - **Metadata Integration**: Rich metadata with intelligence capabilities

## 📁 Project Structure

```
NOTE3/
├── apps/
│   └── web/                          # Next.js frontend application
│       ├── app/                      # App Router pages
│       │   ├── api/                  # API routes
│       │   ├── edit/[id]/           # Note editing pages
│       │   ├── infts/               # INFT management pages
│       │   ├── new/                 # New note creation
│       │   ├── note/[id]/           # Note viewing pages
│       │   ├── globals.css          # Global styles
│       │   ├── layout.tsx           # Root layout
│       │   └── page.tsx             # Homepage
│       ├── src/
│       │   ├── components/          # React components
│       │   │   ├── INFTConverter.tsx    # INFT conversion UI
│       │   │   ├── INFTManager.tsx      # INFT management UI
│       │   │   ├── MarkdownPreview.tsx  # Markdown rendering
│       │   │   ├── NavBar.tsx           # Navigation bar
│       │   │   └── ...                 # Other components
│       │   └── lib/                 # Utility libraries
│       │       ├── 0g-storage.ts    # 0G Storage integration
│       │       ├── config.ts        # Configuration
│       │       ├── image-storage.ts # Image handling
│       │       └── note.ts          # Note management
│       ├── package.json
│       ├── next.config.js
│       └── tailwind.config.js
├── packages/
│   ├── sdk/                         # SDK package
│   │   ├── src/
│   │   │   ├── contracts/           # Smart contracts
│   │   │   │   ├── interfaces/      # ERC-7857 interfaces
│   │   │   │   ├── Note3AgentNFT.sol    # Main INFT contract
│   │   │   │   ├── verifiers/       # Verification contracts
│   │   │   │   └── proxy/           # Proxy contracts
│   │   │   ├── inft.ts              # INFT SDK functions
│   │   │   ├── storage.ts           # Storage utilities
│   │   │   └── ...                  # Other SDK modules
│   │   ├── scripts/                 # Deployment scripts
│   │   ├── hardhat.config.js        # Hardhat configuration
│   │   └── package.json
│   └── types/                       # TypeScript type definitions
│       ├── src/
│       │   ├── index.ts
│       │   └── note.ts              # Note and INFT types
│       └── package.json
├── .gitignore
├── package.json                     # Root package.json
├── pnpm-workspace.yaml             # pnpm workspace config
├── turbo.json                      # Turbo build config
└── README.md
```

## 📋 Deployed Contracts

The following smart contracts have been deployed to the 0G Galileo Testnet:

### Main Contracts
- **Note3AgentNFT (INFT Contract)**: `0x52e82FeB652a67246eaB8Bd2Eb6cFe078C29b45f`
  - [View on 0G Explorer](https://chainscan-galileo.0g.ai/address/0x52e82FeB652a67246eaB8Bd2Eb6cFe078C29b45f)
  - **Standard**: ERC-7857 Intelligent NFT
  - **Features**: AI capabilities, metadata management, intelligence configuration

- **Note3Verifier (Verification Contract)**: `0x1b55eb84F3F8b741D062Fa7aeE68a363884b4bd1`
  - [View on 0G Explorer](https://chainscan-galileo.0g.ai/address/0x1b55eb84F3F8b741D062Fa7aeE68a363884b4bd1)
  - **Purpose**: Proof verification for INFT operations
  - **Type**: TEE/ZKP verification support

- **Implementation Contract**: `0xd08bd2c7Ef5D3D5E87162D2Da99412c4306D6e37`
  - [View on 0G Explorer](https://chainscan-galileo.0g.ai/address/0xd08bd2c7Ef5D3D5E87162D2Da99412c4306D6e37)
  - **Purpose**: Upgradeable implementation logic
  - **Pattern**: UUPS Proxy pattern

### Network Information
- **Network**: 0G Galileo Testnet
- **Chain ID**: 16601
- **RPC URL**: https://evmrpc-testnet.0g.ai/
- **Explorer**: https://chainscan-galileo.0g.ai/
- **Deployed**: September 17, 2025

### Contract Verification
All contracts are verified on the 0G Explorer and can be interacted with using the provided addresses. The contracts implement the ERC-7857 standard for Intelligent NFTs and include full upgradeability support.

## 🔧 Technical Details

### Architecture
- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Wallet Integration**: Wagmi + Viem
- **Storage**: 0G Storage (0G Chain)
- **State Management**: React hooks + localStorage
- **Smart Contracts**: Solidity with Hardhat
- **INFT Standard**: ERC-7857 compliant Intelligent NFTs
- **Blockchain**: 0G Chain (EVM compatible)

### Data Flow
1. **Note Creation**: User input → Local validation → 0G Storage upload → Local index update
2. **Note Retrieval**: Local index lookup → 0G Storage download → UI rendering
3. **Note Editing**: Original note load → User modifications → New version upload → Index update
4. **Image Handling**: File upload → 0G Storage → CID generation → Note reference
5. **INFT Conversion**: Note selection → Intelligence config → Smart contract deployment → INFT minting
6. **INFT Management**: Contract interaction → AI feature execution → Metadata updates → UI rendering

### Storage Structure
```
Local Storage:
├── note3-index (note metadata)
├── note3-categories (category list)
├── 0g-note-{cid} (note content)
└── 0g-file-{cid} (file metadata)

0G Storage:
├── Note objects (JSON)
├── Image files (binary)
└── Merkle tree roots (CIDs)

Blockchain (0G Chain):
├── Note3AgentNFT contract (ERC-7857)
├── Note3Verifier contract (proof verification)
├── INFT tokens (with intelligence metadata)
└── Smart contract state (ownership, metadata)
```

## 💡 Tips & Best Practices

### Note Organization
- **Use consistent categories** for better organization
- **Tag strategically** - think about how you'll search later
- **Keep titles descriptive** for easier identification

### Image Usage
- **Optimize images** before upload (compress large files)
- **Use descriptive alt text** for accessibility
- **Reference images by CID** in your Markdown content

### Performance
- **Large notes** may take longer to upload
- **Multiple images** will increase upload time
- **Local storage** provides fast access to recent notes

### Cost Optimization
- **0G testnet tokens** are free from the faucet
- **Storage fees** are based on data size
- **Image compression** can reduce costs

## 🐛 Troubleshooting

### Common Issues

1. **"Wallet not connected"**
   - Ensure your wallet is connected to the site
   - Check if you're on the correct network (0G testnet)

2. **"Insufficient balance"**
   - Get testnet tokens from [0G Faucet](https://faucet.0g.ai/)
   - Ensure you have enough 0G tokens for storage fees

3. **"Failed to upload"**
   - Check your internet connection
   - Try reducing note size or image count
   - Ensure you have sufficient 0G tokens

4. **"Note not found"**
   - Notes may take time to index
   - Check if the note exists in your local storage
   - Try refreshing the page

### Getting Help
- Check the browser console for detailed error messages
- Ensure you're using a supported browser (Chrome, Firefox, Safari, Edge)
- Verify your wallet connection and network settings

## 🔮 Future Features

- **Public/Private Notes**: Share notes with specific users or make them public
- **Collaborative Editing**: Real-time collaboration on notes
- **Advanced Search**: Full-text search within note content
- **Export Options**: Download notes in various formats
- **Mobile App**: Native mobile application
- **API Access**: Programmatic access to notes and data
- **Advanced AI Features**: Translation, sentiment analysis, content generation
- **INFT Marketplace**: Trade and exchange Intelligent NFTs
- **Cross-chain Support**: Deploy INFTs on multiple blockchains
- **AI Model Integration**: Connect with various AI models and services
- **INFT Analytics**: Track usage and performance metrics
- **Automated Intelligence**: Auto-generate summaries and Q&A pairs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**Note**: This application is built on 0G Storage testnet. Always backup important data and be aware that testnet data may not be permanent.
