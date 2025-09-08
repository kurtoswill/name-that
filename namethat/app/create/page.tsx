'use client';


import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, X, FileImage, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAccount, useWalletClient, usePublicClient, useConnect } from 'wagmi';
import WalletConnectMenu from '@/app/components/WalletConnectMenu';
import { encodeFunctionData } from 'viem';
import type { Abi } from 'viem';

export default function CreatePage() {
    // Hydration guard for client-only UI
    const [isHydrated, setIsHydrated] = useState(false);
    useEffect(() => { setIsHydrated(true); }, []);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const TITLE_MAX = 60;
    const DESCRIPTION_MAX = 300;
    const [ethPrize, setEthPrize] = useState('0.00027');
    const [usdPrize, setUsdPrize] = useState('1.25');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [ethToUsdRate, setEthToUsdRate] = useState(4630); // Default rate
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const { address, isConnected, connector } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const { connect, connectors: availableConnectors } = useConnect();
    const [hasInjectedProvider, setHasInjectedProvider] = useState(false);
    const [walletClientReady, setWalletClientReady] = useState(false);
    const [showReconnectHelp, setShowReconnectHelp] = useState(false);
    

    // helper: send transaction using walletClient when available, otherwise fall back to injected provider (window.ethereum)
    const sendTxWithFallback = async (params: { to?: string | null; data?: string; value?: bigint; account?: `0x${string}` }) => {
        // prefer wagmi walletClient
        if (walletClient) {
            return await (walletClient as unknown as { sendTransaction: (p: unknown) => Promise<string> }).sendTransaction(params as unknown);
        }

        // Do not attempt to deploy contracts via injected provider fallback - many injected providers
        // require specialized handling or a WalletClient that signs raw txs. If `to` is undefined/null
        // this indicates a contract creation. Require walletClient for deployments.
        if (!walletClient && (params.to === undefined || params.to === null)) {
            throw new Error('Contract deployment requires a fully initialized wallet client; please wait for your wallet connector to finish initializing');
        }

        // fallback to injected provider via EIP-1193 eth_sendTransaction
        const provider = typeof window !== 'undefined'
            ? (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
            : undefined;
        if (!provider || typeof provider.request !== 'function') {
            throw new Error('No wallet client available and no injected provider found for fallback');
        }

    const txParams: Record<string, unknown> = { from: params.account || address };
    // include `to` only when provided; omit for contract creation (handled above)
    if (params.to !== undefined && params.to !== null) txParams.to = params.to;
        if (params.data) txParams.data = params.data;
        if (params.value !== undefined) {
            // value must be hex string
            txParams.value = '0x' + params.value.toString(16);
        }

        // eth_sendTransaction returns the transaction hash
        const txHash = await provider.request({ method: 'eth_sendTransaction', params: [txParams] });
        return txHash as string;
    };

    // Debug connector / walletClient state to help diagnose readiness issues
    useEffect(() => {
        console.debug('WAGMI connector:', connector);
        console.debug('walletClient:', walletClient);
        console.debug('publicClient:', publicClient);
        // detect injected provider availability in browser
        try {
            const win = typeof window !== 'undefined' ? (window as unknown) : undefined;
            const injected = Boolean(win && (win as { ethereum?: unknown }).ethereum && typeof ((win as { ethereum?: { request?: unknown } }).ethereum?.request) === 'function');
            setHasInjectedProvider(injected);
        } catch {
            setHasInjectedProvider(false);
        }
        if (connector) {
            try {
                // Some connectors implement helper methods; check availability
                console.debug('connector methods:', Object.keys(connector as unknown as Record<string, unknown>));
                console.debug('connector.getChainId is function?', typeof ((connector as unknown) as { [k: string]: unknown }).getChainId === 'function');
            } catch (e) {
                console.debug('connector introspect failed', e);
            }
        }
        // reflect walletClient readiness
        setWalletClientReady(Boolean(walletClient));
    }, [connector, walletClient, publicClient]);

    // If walletClient doesn't become ready after a short period, show a reconnect help area
    useEffect(() => {
        let t: ReturnType<typeof setTimeout> | undefined;
        setShowReconnectHelp(false);
        if (isConnected && !walletClient) {
            // give connectors a chance to initialize, then surface help
            t = setTimeout(() => setShowReconnectHelp(true), 8000);
        }
        return () => { if (t) clearTimeout(t); };
    }, [isConnected, walletClient]);

    const tryConnectMetaMask = async () => {
        try {
            // prefer any available MetaMask-like connector
            const mm = availableConnectors.find(c => (c.id === 'metaMask' || (c.name && c.name.toLowerCase().includes('meta'))));
            if (!mm) {
                setErrorMessage('MetaMask connector not available in this environment');
                return;
            }
            await connect({ connector: mm });
            // connecting should trigger wagmi state changes and eventually walletClient
            setErrorMessage(null);
        } catch (e) {
            console.error('MetaMask reconnect failed', e);
            setErrorMessage((e as Error)?.message || 'Failed to connect MetaMask');
        }
    };

    // Wait for walletClient to become available with timeout.
    const waitForWalletClient = async (timeoutMs = 15000) => {
        const start = Date.now();
        // quick path
        if (walletClient) return;
        while (!walletClient) {
            if (Date.now() - start > timeoutMs) {
                throw new Error('Timed out waiting for wallet client to initialize');
            }
            // sleep 700ms between checks - allows connector to finish
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, 700));
        }
    };
    const [username, setUsername] = useState<string | null>(null);
    const [prizeError, setPrizeError] = useState<string | null>(null);
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    // Fetch username from our database for the connected address
    useEffect(() => {
        let cancelled = false;
        async function fetchUsername() {
            if (!address) {
                setUsername(null);
                return;
            }
            try {
                const res = await fetch(`/api/user?id=${address}`);
                if (!res.ok) {
                    setUsername(null);
                    return;
                }
                const user = await res.json();
                if (!cancelled) setUsername(user?.username ?? null);
            } catch {
                if (!cancelled) setUsername(null);
            }
        }
        fetchUsername();
        return () => {
            cancelled = true;
        };
    }, [address]);

    // Fetch ETH to USD conversion rate
    const fetchEthRate = async () => {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
            const data = await response.json();
            const rate = data.ethereum.usd;
            setEthToUsdRate(rate);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch ETH rate:', error);
        }
    };

    // Update rates every minute
    useEffect(() => {
        fetchEthRate(); // Initial fetch
        const interval = setInterval(fetchEthRate, 60000); // Update every 60 seconds
        return () => clearInterval(interval);
    }, []);

    // Update USD when ETH changes (no longer allow USD input) and validate minimum $1
    const handleEthChange = (value: string) => {
        setEthPrize(value);
        const parsed = parseFloat(value);
        const ethValue = isNaN(parsed) ? 0 : parsed;
        const usdValueRaw = ethValue * ethToUsdRate;
        // Work in integer cents to avoid floating point precision issues
        const usdCents = Math.round(usdValueRaw * 100);
        const usdValue = (usdCents / 100).toFixed(2);
        setUsdPrize(usdValue);

        if (usdCents < 100) {
            setPrizeError('Minimum prize is $1 USD equivalent. Please increase the ETH amount.');
        } else {
            setPrizeError(null);
        }
    };

    // (validateBeforePost removed - validation is handled inline and via isFormValid)

    // Live form validity for disabling the Post button (inlined to avoid stale closure)
    const isFormValid = useMemo(() => {
        // Require wallet, title, description, valid prize, and an uploaded image
    // Require wallet, title, description, valid prize, and an uploaded image
    if (!isConnected) return false;
        if (!title || !title.trim()) return false;
        if (!description || !description.trim()) return false;
        if (title.length > TITLE_MAX) return false;
        if (description.length > DESCRIPTION_MAX) return false;
        const parsed = parseFloat(ethPrize || '0');
        if (isNaN(parsed) || parsed <= 0) return false;
        const usdCents = Math.round(parsed * ethToUsdRate * 100);
        if (usdCents < 100) return false;
        if (!uploadedFile) return false;
        if (!uploadedFile.type.startsWith('image/')) return false;
        if (uploadedFile.size > MAX_FILE_SIZE) return false;
        return true;
    }, [isConnected, title, description, ethPrize, ethToUsdRate, uploadedFile, MAX_FILE_SIZE]);
    // compute button inner content
    const postButtonContent = useMemo(() => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Creating Post...'}
                </div>
            );
        }

        if (!publicClient) {
            return (
                <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Network unavailable
                </div>
            );
        }

        if (!(walletClient || hasInjectedProvider)) {
            return (
                <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Initializing wallet...
                </div>
            );
        }

        return 'Post';
    }, [isLoading, uploadProgress, publicClient, walletClient, hasInjectedProvider]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Only image files are allowed.');
                (event.target as HTMLInputElement).value = '';
                return;
            }
            setUploadedFile(file);
        }
    };

    const handleRemoveFile = () => {
        setUploadedFile(null);
        // Reset the file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    };

    const getFileIcon = () => {
        return <FileImage size={20} className="text-[#E4A2B1]" />;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handlePost = async () => {
        try {
            setErrorMessage(null);
            
            if (!isConnected) {
                setErrorMessage('Please connect your wallet to post');
                return;
            }
            if (!publicClient || !(walletClient || hasInjectedProvider)) {
                setErrorMessage('Wallet connection is still initializing. Please wait a moment and try again.');
                return;
            }
            if (!title || !description) {
                setErrorMessage('Please fill in all required fields');
                return;
            }
            if (title.length > TITLE_MAX || description.length > DESCRIPTION_MAX) {
                setErrorMessage(`Title or description exceeds maximum length (${TITLE_MAX} / ${DESCRIPTION_MAX})`);
                return;
            }
            // Final pre-submit validation (defense in depth)
            if (!uploadedFile) {
                setErrorMessage('Please upload an image for your post');
                return;
            }
            if (!uploadedFile.type.startsWith('image/')) {
                setErrorMessage('Uploaded file must be an image');
                return;
            }
            if (uploadedFile.size > MAX_FILE_SIZE) {
                setErrorMessage('Uploaded image must be 5MB or smaller');
                return;
            }
            // Validate using integer cents to avoid floating-point issues
            const usdCentsAtPost = Math.round(parseFloat(ethPrize || '0') * ethToUsdRate * 100);
            if (usdCentsAtPost < 100) {
                setErrorMessage('Minimum prize is $1 USD equivalent. Please increase the ETH amount.');
                return;
            }

            setIsLoading(true);
            
            // First, upload image if provided
            let imageUrl: string | undefined = undefined;
            if (uploadedFile) {
                const formData = new FormData();
                formData.append('file', uploadedFile);

                setUploadProgress(20);
                const uploadRes = await fetch('/api/upload', { 
                    method: 'POST', 
                    body: formData 
                });
                
                if (!uploadRes.ok) {
                    const uploadJson = await uploadRes.json();
                    throw new Error(uploadJson.error || 'Image upload failed');
                }

                const uploadData = await uploadRes.json();
                imageUrl = uploadData.secure_url || uploadData.url;
                setUploadProgress(50);
            }


            // Then deploy the escrow contract with the prize value sent to the constructor

            // We'll need the bytecode. For simplicity and to avoid adding build artifacts,
            // use a precompiled bytecode placeholder injected at build time in real apps.
            // Here we try to use a heuristics: if hardhat/viem available on the client it's not,
            // so instead we'll call an API route that performs deployment server-side using a funded deployer.

            let escrowAddress: string | undefined = undefined;
            const deployTxHash: string | undefined = undefined;

                // walletClient/publicClient are used for deploy + refund flows
                try {
                    // Use walletClient and publicClient from wagmi hooks (or fallback injected provider)
                    if (!publicClient) {
                        throw new Error('Public client unavailable for on-chain operations');
                    }
                    // Wait briefly for walletClient to become ready (if the user just connected)
                    try {
                        await waitForWalletClient(12000);
                    } catch {
                        // If wait times out, surface a clearer error to user
                        throw new Error('Wallet client did not initialize. Please reconnect or try the MetaMask reconnect button.');
                    }
                    if (!walletClient && !hasInjectedProvider) {
                        throw new Error('Unable to access wallet client or injected provider for on-chain operations');
                    }

                // We need the compiled bytecode for PostEscrow. Request it from an API route that can return it from artifacts.
                const byteRes = await fetch('/api/bytecode?contract=PostEscrow');
                if (!byteRes.ok) throw new Error('Failed to fetch contract bytecode');
                const { bytecode } = await byteRes.json();
                if (!bytecode) throw new Error('No bytecode available for PostEscrow');

                // Prepare write (deploy contract) via wagmi core
                const prizeValue = BigInt(Math.round(parseFloat(ethPrize || '0') * 1e18));

                // No prepareWriteContract available in this environment; deploy by sending raw tx with bytecode + value

                // Fallback: send raw transaction with data = bytecode and value
                const txHash = await sendTxWithFallback({
                    to: undefined,
                    data: bytecode,
                    value: prizeValue,
                    account: address as `0x${string}`,
                });

                // wait for tx to be mined
                const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

                // Some clients return status as 'reverted'|'success', others numeric (0/1). Be defensive.
                const status = (receipt as unknown as { status?: string | number }).status;
                const txFailed = status === 'reverted' || status === 0 || status === '0x0' || status === 'failed';
                if (txFailed) {
                    throw new Error('Deployment transaction reverted');
                }

                escrowAddress = (receipt as unknown as { contractAddress?: `0x${string}` }).contractAddress;
                if (!escrowAddress) throw new Error('Failed to get escrow contract address from receipt');
                // If a treasury address is configured at build/runtime, set it on the escrow contract
                try {
                    const treasury = (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_TREASURY_ADDRESS as string | undefined)) || undefined;
                    if (treasury) {
                        const setTreasuryAbi: Abi = [{
                            inputs: [{ internalType: 'address', name: '_treasury', type: 'address' }],
                            name: 'setPlatformTreasury',
                            outputs: [],
                            stateMutability: 'nonpayable',
                            type: 'function',
                        }];

                        // encode calldata using viem
                        const calldata = encodeFunctionData({ abi: setTreasuryAbi, functionName: 'setPlatformTreasury', args: [treasury] });

                        // send transaction from user's wallet to call setPlatformTreasury
                        await sendTxWithFallback({
                            to: escrowAddress as `0x${string}`,
                            data: calldata,
                            account: address as `0x${string}`,
                        });
                    }
                } catch (e) {
                    console.warn('Failed to set platform treasury on escrow contract:', e);
                    // Not fatal — platform fee will remain in contract if not set
                }
            } catch (depErr) {
                console.error('Escrow deploy failed:', depErr);
                throw new Error((depErr as Error).message || 'Failed to deploy escrow contract');
            }

            // Then create the post
            const postRes = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    imageUrl,
                    prizeEth: parseFloat(ethPrize),
                    creator: address,
                    escrowAddress,
                    deployTxHash,
                }),
            });

            if (!postRes.ok) {
                const errorData = await postRes.json();

                // Attempt to refund by calling deletePost() on the escrow contract so the user gets their funds back.
                try {
                    if (escrowAddress) {
                        const deleteAbi: Abi = [{ inputs: [], name: 'deletePost', outputs: [], stateMutability: 'nonpayable', type: 'function' }];
                        const calldataRefund = encodeFunctionData({ abi: deleteAbi, functionName: 'deletePost', args: [] });
                        if (!publicClient || !(walletClient || hasInjectedProvider)) throw new Error('Wallet or public client unavailable for refund');
                        // send refund tx from user's wallet to trigger selfdestruct/refund
                        const refundTxHash = await sendTxWithFallback({
                            to: escrowAddress as `0x${string}`,
                            data: calldataRefund,
                            account: address as `0x${string}`,
                        });
                        // wait for refund to be mined
                        await publicClient.waitForTransactionReceipt({ hash: refundTxHash as `0x${string}` });
                    }
                } catch (refundErr) {
                    console.error('Refund failed after post creation failure:', refundErr);
                    // At this point the user may need to manually call deletePost on the contract or contact support.
                    throw new Error(errorData.error || 'Failed to create post; refund attempt failed. Please contact support.');
                }

                throw new Error(errorData.error || 'Failed to create post; funds refunded to your wallet.');
            }

            setUploadProgress(100);

            // TODO: Here we'll need to:
            // 1. Create smart contract for prize pool escrow
            // 2. Transfer ETH from user's wallet to the escrow contract
            // 3. Store contract address and transaction hash in the database
            // 4. Set up event listeners for winner selection and prize distribution

            window.location.href = '/';
        } catch (error) {
            console.error('Failed to create post:', error);
            setErrorMessage((error as Error).message || 'Failed to create post. Please try again.');
        } finally {
            setIsLoading(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="min-h-screen bg-[#12242E] text-[#F3E3EA] p-4">
            {/* Header with back button and wallet connection */}
            <div className="flex items-center justify-between mb-8 pt-4">
                <div className="flex items-center">
                    <Link href="/" className="mr-4">
                        <ArrowLeft size={24} className="text-[#E4A2B1]" />
                    </Link>
                    <h1 className="text-xl font-semibold">Create Post</h1>
                </div>

                {/* Wallet Connection in Header - only after hydration */}
                {isHydrated && !isConnected && <WalletConnectMenu />}

                {isHydrated && isConnected && (
                    <div className="flex items-center text-xs text-[#21B65F]">
                        <div className="w-2 h-2 bg-[#21B65F] rounded-full mr-2"></div>
                        {address && (
                            <span>
                                {username}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {/* Title */}
                <div>
                    <label className="block text-lg font-medium mb-3">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                        maxLength={TITLE_MAX}
                        placeholder="Ask the community to name your pet, product, or project"
                        className="w-full p-3 bg-[#20333D] border border-[#324859] rounded-lg text-[#F3E3EA] placeholder-[#F3E3EA]/50 focus:outline-none focus:border-[#E4A2B1] transition-colors"
                    />
                    <div className="text-xs text-[#E4A2B1]/70 mt-2">{title.length} / {TITLE_MAX}</div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-lg font-medium mb-3">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                        maxLength={DESCRIPTION_MAX}
                        placeholder="Add details to help the community come up with better names (e.g., personality, purpose, style)"
                        rows={4}
                        className="w-full p-3 bg-[#20333D] border border-[#324859] rounded-lg text-[#F3E3EA] placeholder-[#F3E3EA]/50 focus:outline-none focus:border-[#E4A2B1] transition-colors resize-none"
                    />
                    <div className="text-xs text-[#E4A2B1]/70 mt-2">{description.length} / {DESCRIPTION_MAX}</div>
                </div>

                {/* Upload File */}
                <div>
                    <label className="block text-lg font-medium mb-3">Upload File</label>

                    {!uploadedFile ? (
                        <div>
                            <div className="relative inline-block w-20 h-20">
                                <input
                                    id="file-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-lg"
                                />
                                <div className="w-20 h-20 bg-[#20333D] border border-[#324859] rounded-lg flex items-center justify-center cursor-pointer hover:border-[#E4A2B1] transition-colors">
                                    <Plus size={24} className="text-[#E4A2B1]" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-[#20333D] border border-[#324859] rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                {getFileIcon()}
                                <div>
                                    <p className="text-[#F3E3EA] text-sm truncate max-w-48">{uploadedFile.name}</p>
                                    <p className="text-[#E4A2B1]/70 text-xs">{formatFileSize(uploadedFile.size)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {uploadedFile && (
                                    <div className="relative w-16 h-16">
                                        {isLoading ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-[#20333D]/80 rounded-md border border-[#324859]">
                                                <Loader2 className="w-5 h-5 animate-spin text-[#E4A2B1]" />
                                            </div>
                                        ) : (
                                            <Image 
                                                src={URL.createObjectURL(uploadedFile)} 
                                                alt="preview" 
                                                fill
                                                className="object-cover rounded-md border border-[#324859]"
                                            />
                                        )}
                                    </div>
                                )}
                                <button
                                    onClick={handleRemoveFile}
                                    disabled={isLoading}
                                    className={`text-[#E4A2B1] transition-colors p-1 ${
                                        isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:text-[#F3E3EA]'
                                    }`}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Prize Pool */}
                <div>
                    <label className="block text-lg font-medium">Prize Pool</label>
                    <div className="flex justify-between text-xs text-[#E4A2B1]/70 mb-3">
                        <span>Minimum: {(1 / ethToUsdRate).toFixed(6)} ETH</span>
                        <span>Rate updated: {isHydrated && lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</span>
                    </div>
                    <div className="bg-[#20333D] border border-[#324859] rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center min-w-0">
                                    <input
                                        type="number"
                                        step="0.00000001"
                                        value={ethPrize}
                                        onChange={(e) => handleEthChange(e.target.value)}
                                        className="bg-transparent text-2xl font-medium text-[#F3E3EA] focus:outline-none placeholder-[#F3E3EA]/50 flex-1 min-w-0 overflow-x-auto"
                                        placeholder="0"
                                        inputMode="decimal"
                                    />
                                <p className="text-[#FBE2A7]/70 ml-2 whitespace-nowrap">ETH</p>
                            </div>
                            <div className="flex items-center whitespace-nowrap ml-auto">
                                <span className="text-lg text-[#FBE2A7]/70">$</span>
                                <span className="text-lg text-[#F3E3EA] ml-1">{usdPrize}</span>
                                <span className="text-[#FBE2A7]/70 ml-1 text-sm">USD</span>
                            </div>
                        </div>
                    </div>

                    {/* Distribution breakdown - smaller and at bottom */}
                    <div className="flex justify-between text-xs text-center mt-3">
                        <div className="text-[#21B65F]">
                            Winner: {(parseFloat(ethPrize) * 0.5).toFixed(5)} ETH
                        </div>
                        <div className="text-[#E4A2B1]">
                            Voters: {(parseFloat(ethPrize) * 0.3).toFixed(5)} ETH
                        </div>
                        <div className="text-[#F59E0B]">
                            Platform: {(parseFloat(ethPrize) * 0.2).toFixed(5)} ETH
                        </div>
                    </div>
                </div>
            </div>

            {/* Post Button and Error Message */}
            <div className="mt-8 space-y-4">
                {/* Wallet diagnostic info */}
                {isHydrated && isConnected && (
                    <div className="text-xs text-[#21B65F] mb-2">
                        <div>Wallet connected: <span className="font-mono">{address}</span></div>
                        <div>Wallet client: {walletClient ? 'Ready' : 'Not ready'}</div>
                        <div>Injected provider: {hasInjectedProvider ? 'Available' : 'Not available'}</div>
                        <div>Public client: {publicClient ? 'Ready' : 'Not ready'}</div>
                    </div>
                )}
                {isHydrated && isConnected && showReconnectHelp && !walletClient && (
                    <div className="text-sm bg-[#324859] border border-[#2b3e45] rounded-lg p-3 mt-2">
                        <div className="mb-2">It looks like your wallet connector hasn&apos;t finished initializing. If you&apos;re using MetaMask, try reconnecting manually.</div>
                        <div className="flex gap-2">
                            <button onClick={tryConnectMetaMask} className="px-3 py-1 bg-[#21B65F] rounded text-[#12242E]">Reconnect MetaMask</button>
                            <button onClick={() => window.location.reload()} className="px-3 py-1 bg-[#20333D] border border-[#324859] rounded">Reload Page</button>
                        </div>
                    </div>
                )}
                {errorMessage && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <p>{errorMessage}</p>
                    </div>
                )}
                {prizeError && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <p>{prizeError}</p>
                    </div>
                )}
                
                {/* Primary action area (stable placeholder until hydration) */}
                {/** compute button inner content cleanly to avoid nested JSX ternary parsing issues */}
                {/** depends on walletClient / publicClient / hasInjectedProvider / isLoading / uploadProgress */}
                {/* post button content computed above */}
                {!isHydrated ? (
                    <div className="mini-app-theme">
                        <button className="w-full py-2 rounded-lg text-lg font-medium transition-colors bg-[#fbe2a7]/50 hover:bg-[#F5D982] text-[#12242E]" disabled>
                            <span>Connect Wallet</span>
                        </button>
                    </div>
                ) : !isConnected ? (
                    <div className="mini-app-theme">
                        <WalletConnectMenu />
                    </div>
                ) : (
                    <>
                        <button
                            onClick={handlePost}
                            disabled={isLoading || !isFormValid || !publicClient || !(walletClient || hasInjectedProvider)}
                            className={`w-full py-2 rounded-lg text-lg font-medium transition-colors relative ${
                                !isLoading && isFormValid && (walletClient || hasInjectedProvider) && publicClient
                                    ? 'bg-[#FBE2A7] text-[#12242E] hover:bg-[#F5D982]'
                                    : 'bg-[#324859] text-[#FBE2A7]/50 cursor-not-allowed'
                            }`}
                        >
                            {postButtonContent}
                        </button>

                        {isLoading && uploadProgress > 0 && (
                            <div className="w-full bg-[#324859] rounded-full h-1 mt-2">
                                <div 
                                    className="bg-[#FBE2A7] h-1 rounded-full transition-all duration-300" 
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}