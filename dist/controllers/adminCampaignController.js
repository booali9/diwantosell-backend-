"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCampaignStats = exports.toggleCampaignStatus = exports.deleteCampaign = exports.updateCampaign = exports.createCampaign = exports.getCampaignById = exports.getCampaigns = void 0;
const Campaign_1 = __importDefault(require("../models/Campaign"));
// @desc    Get all campaigns
// @route   GET /api/admin/campaigns
// @access  Private
const getCampaigns = async (req, res) => {
    try {
        console.log('[DEBUG] Fetching campaigns from database...');
        const campaigns = await Campaign_1.default.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        console.log('[DEBUG] Found', campaigns.length, 'campaigns');
        res.json(campaigns);
    }
    catch (error) {
        console.error('[ERROR] Get campaigns error:', error);
        res.json([]);
    }
};
exports.getCampaigns = getCampaigns;
// @desc    Get campaign by ID
// @route   GET /api/admin/campaigns/:id
// @access  Private
const getCampaignById = async (req, res) => {
    try {
        const campaign = await Campaign_1.default.findById(req.params.id)
            .populate('createdBy', 'name email');
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        res.json(campaign);
    }
    catch (error) {
        console.error('[ERROR] Get campaign by ID error:', error);
        res.status(500).json({
            message: 'Server error getting campaign',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getCampaignById = getCampaignById;
// @desc    Create new campaign
// @route   POST /api/admin/campaigns
// @access  Private
const createCampaign = async (req, res) => {
    try {
        const { name, description, type, eligibility, reward, startDate, endDate, } = req.body;
        console.log('[DEBUG] Creating campaign with data:', { name, type, startDate, endDate });
        // Validate required fields
        if (!name || !description || !startDate || !endDate) {
            return res.status(400).json({
                message: 'Missing required fields: name, description, startDate, and endDate are required'
            });
        }
        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }
        if (end <= start) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }
        // Determine initial status based on dates
        const now = new Date();
        let status = 'draft';
        if (now < start) {
            status = 'scheduled';
        }
        else if (now >= start && now <= end) {
            status = 'active';
        }
        // Handle admin ID
        let createdBy = req.admin?._id;
        if (createdBy === 'temp_admin_id' || !createdBy) {
            createdBy = undefined;
        }
        const campaignData = {
            name,
            description,
            type: type || 'deposit',
            eligibility: eligibility || {
                allUsers: true,
                newUsers: false,
                kycRequired: false,
                minDepositAmount: 0,
            },
            reward: reward || {
                rewardType: 'bonus',
                amount: 0,
                maxReward: 0,
            },
            startDate: start,
            endDate: end,
            status,
            stats: {
                participants: 0,
                totalRewardsIssued: 0,
                conversionRate: 0,
            },
        };
        // Only add createdBy if it's a valid ObjectId
        if (createdBy && createdBy.toString().match(/^[0-9a-fA-F]{24}$/)) {
            campaignData.createdBy = createdBy;
        }
        console.log('[DEBUG] Creating campaign with data:', campaignData);
        const campaign = await Campaign_1.default.create(campaignData);
        console.log('[DEBUG] Created new campaign:', campaign._id);
        res.status(201).json(campaign);
    }
    catch (error) {
        console.error('[ERROR] Create campaign error:', error);
        res.status(500).json({
            message: 'Server error creating campaign',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createCampaign = createCampaign;
// @desc    Update campaign
// @route   PUT /api/admin/campaigns/:id
// @access  Private
const updateCampaign = async (req, res) => {
    try {
        const campaign = await Campaign_1.default.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        const updatedCampaign = await Campaign_1.default.findByIdAndUpdate(req.params.id, { ...req.body }, { new: true }).populate('createdBy', 'name email');
        console.log('[DEBUG] Updated campaign:', req.params.id);
        res.json(updatedCampaign);
    }
    catch (error) {
        console.error('[ERROR] Update campaign error:', error);
        res.status(500).json({
            message: 'Server error updating campaign',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateCampaign = updateCampaign;
// @desc    Delete campaign
// @route   DELETE /api/admin/campaigns/:id
// @access  Private
const deleteCampaign = async (req, res) => {
    try {
        const campaign = await Campaign_1.default.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        await Campaign_1.default.findByIdAndDelete(req.params.id);
        console.log('[DEBUG] Deleted campaign:', req.params.id);
        res.json({ message: 'Campaign deleted successfully' });
    }
    catch (error) {
        console.error('[ERROR] Delete campaign error:', error);
        res.status(500).json({
            message: 'Server error deleting campaign',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.deleteCampaign = deleteCampaign;
// @desc    Toggle campaign status (pause/resume)
// @route   PUT /api/admin/campaigns/:id/toggle
// @access  Private
const toggleCampaignStatus = async (req, res) => {
    try {
        const campaign = await Campaign_1.default.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        // Toggle between paused and active
        if (campaign.status === 'paused') {
            const now = new Date();
            if (now >= campaign.startDate && now <= campaign.endDate) {
                campaign.status = 'active';
            }
            else if (now < campaign.startDate) {
                campaign.status = 'scheduled';
            }
            else {
                campaign.status = 'ended';
            }
        }
        else if (campaign.status === 'active' || campaign.status === 'scheduled') {
            campaign.status = 'paused';
        }
        await campaign.save();
        console.log('[DEBUG] Toggled campaign status:', req.params.id, 'to', campaign.status);
        res.json(campaign);
    }
    catch (error) {
        console.error('[ERROR] Toggle campaign status error:', error);
        res.status(500).json({
            message: 'Server error toggling campaign status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.toggleCampaignStatus = toggleCampaignStatus;
// @desc    Get campaign stats
// @route   GET /api/admin/campaigns/stats
// @access  Private
const getCampaignStats = async (req, res) => {
    try {
        console.log('[DEBUG] Fetching campaign stats...');
        const [totalResult, activeResult, scheduledResult] = await Promise.allSettled([
            Campaign_1.default.countDocuments(),
            Campaign_1.default.countDocuments({ status: 'active' }),
            Campaign_1.default.countDocuments({ status: 'scheduled' }),
        ]);
        const total = totalResult.status === 'fulfilled' ? totalResult.value : 0;
        const active = activeResult.status === 'fulfilled' ? activeResult.value : 0;
        const scheduled = scheduledResult.status === 'fulfilled' ? scheduledResult.value : 0;
        // Get participants and rewards stats
        const campaigns = await Campaign_1.default.find();
        let totalParticipants = 0;
        let totalRewards = 0;
        campaigns.forEach(campaign => {
            totalParticipants += campaign.stats?.participants || 0;
            totalRewards += campaign.stats?.totalRewardsIssued || 0;
        });
        console.log('[DEBUG] Campaign stats calculated successfully');
        res.json({
            totalCampaigns: total,
            activeCampaigns: active,
            scheduledCampaigns: scheduled,
            totalParticipants,
            totalRewards,
        });
    }
    catch (error) {
        console.error('[ERROR] Get campaign stats error:', error);
        res.status(500).json({
            message: 'Server error getting campaign stats',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getCampaignStats = getCampaignStats;
