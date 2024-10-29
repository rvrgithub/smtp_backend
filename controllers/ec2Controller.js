// src/routes/ec2Routes.js

const express = require('express');
const {
  EC2Client,
  DescribeInstancesCommand,
  ReleaseAddressCommand,
  DescribeAddressesCommand,
  AllocateAddressCommand,
  AssociateAddressCommand,
} = require('@aws-sdk/client-ec2');

const router = express.Router();
const ec2 = new EC2Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
// Route: Fetch running EC2 instance IPs
router.get('/ips', async (req, res) => {
    try {
      const command = new DescribeInstancesCommand({});
      const instances = await ec2.send(command);
  
      // Retrieve Elastic IPs
      const describeAddressesCommand = new DescribeAddressesCommand({});
      const addressResult = await ec2.send(describeAddressesCommand);
      const elasticIps = addressResult.Addresses || [];
  
      // Filter for running instances
      const runningInstances = instances.Reservations.flatMap(r =>
        r.Instances.filter(i => i.State.Name === 'running')
      );
  
      // Map instances to their IPs and associated Elastic IPs
      const ips = runningInstances.map(instance => {
        const publicIps = instance.NetworkInterfaces.flatMap(ni =>
          ni.Association?.PublicIp ? [ni.Association.PublicIp] : []
        );
        const privateIps = instance.NetworkInterfaces.flatMap(ni =>
          ni.PrivateIpAddresses.map(ipInfo => ipInfo.PrivateIpAddress)
        );
  
        // Find associated Elastic IPs
        const associatedElasticIps = elasticIps.filter(eip => eip.InstanceId === instance.InstanceId);
        
        return {
          instanceId: instance.InstanceId,
          publicIps: publicIps,
          privateIps: privateIps,
          elasticIps: associatedElasticIps.map(eip => eip.PublicIp),
        };
      });
  
      // Prepare response with Elastic IPs in desired format
      const responseIps = ips.flatMap(ip => ip.elasticIps).map(publicIp => ({
        AllocationId: null, // AllocationId would be fetched if you want to implement that
        PublicIp: publicIp,
      }));
  
      // Create the final response
      res.json({
        message: `Fetched Elastic IPs.`,
        newIps: responseIps,
      });
    } catch (error) {
      console.error('Error fetching EC2 IPs:', error);
      res.status(500).send('Failed to fetch EC2 IPs');
    }
  });
  


// Route: Refresh IPs based on conditions and create new IPs
router.post('/refresh-ips/:count', async (req, res) => {
  const ipCount = parseInt(req.params.count);

  try {
    // Get running instances
    const instancesCommand = new DescribeInstancesCommand({});
    const instances = await ec2.send(instancesCommand);
    const runningInstances = instances.Reservations.flatMap(r =>
      r.Instances.filter(i => i.State.Name === 'running')
    );

    if (runningInstances.length === 0) {
      return res.status(400).json({
        message: 'No running instances found.',
      });
    }

    // Retrieve existing Elastic IPs
    const describeAddressesCommand = new DescribeAddressesCommand({});
    const addressResult = await ec2.send(describeAddressesCommand);
    const existingIps = addressResult.Addresses;

    // Release all existing IPs
    const releasePromises = existingIps.map(ip => {
      const releaseCommand = new ReleaseAddressCommand({ AllocationId: ip.AllocationId });
      return ec2.send(releaseCommand);
    });

    await Promise.all(releasePromises);

    // Allocate new Elastic IPs
    const newIps = [];
    const allocationPromises = Array.from({ length: ipCount }, async () => {
      const allocateCommand = new AllocateAddressCommand({ Domain: 'vpc' });
      const result = await ec2.send(allocateCommand);
      newIps.push({ AllocationId: result.AllocationId, PublicIp: result.PublicIp });
      return result;
    });

    await Promise.all(allocationPromises);

    // Associate IPs to instances
    const instanceAssociations = runningInstances.map(async (instance, index) => {
      const ip = newIps[index % newIps.length];
      const associateCommand = new AssociateAddressCommand({
        InstanceId: instance.InstanceId,
        AllocationId: ip.AllocationId,
      });
      await ec2.send(associateCommand);
    });

    await Promise.all(instanceAssociations);

    // Return response with allocated and associated IPs
    res.json({
      message: `Allocated and associated ${ipCount} Elastic IPs.`,
      newIps,
    });
  } catch (error) {
    console.error('Error refreshing Elastic IPs:', error);
    res.status(500).send('Failed to refresh IPs');
  }
});

// Route: Refresh IP for a specific instance
router.post('/refresh-ip/:instanceId', async (req, res) => {
  const instanceId = req.params.instanceId;

  try {
    // Check if there is an Elastic IP associated with the instance
    const describeCommand = new DescribeAddressesCommand({
      Filters: [{ Name: 'instance-id', Values: [instanceId] }]
    });
    const { Addresses } = await ec2.send(describeCommand);

    if (Addresses.length === 0) {
      // No Elastic IP found: Allocate and associate a new one
      console.log(`No Elastic IP found for instance ${instanceId}. Allocating a new one.`);
      const allocateCommand = new AllocateAddressCommand({ Domain: 'vpc' });
      const allocation = await ec2.send(allocateCommand);

      const associateCommand = new AssociateAddressCommand({
        InstanceId: instanceId,
        AllocationId: allocation.AllocationId,
      });
      await ec2.send(associateCommand);

      return res.json({
        message: 'New IP address allocated and associated with the EC2 instance',
        newPublicIp: allocation.PublicIp,
      });
    }

    // If an Elastic IP exists, release it and allocate a new one
    const oldAllocationId = Addresses[0].AllocationId;
    console.log(`Releasing old Elastic IP with AllocationId: ${oldAllocationId}`);

    const releaseCommand = new ReleaseAddressCommand({ AllocationId: oldAllocationId });
    await ec2.send(releaseCommand);

    const allocateCommand = new AllocateAddressCommand({ Domain: 'vpc' });
    const allocation = await ec2.send(allocateCommand);

    const associateCommand = new AssociateAddressCommand({
      InstanceId: instanceId,
      AllocationId: allocation.AllocationId,
    });
    await ec2.send(associateCommand);

    res.json({
      message: 'IP address refreshed and associated with the EC2 instance',
      newPublicIp: allocation.PublicIp,
    });
  } catch (error) {
    console.error('Error refreshing IP:', error);
    res.status(500).send('Failed to refresh IP');
  }
});


module.exports = router;
