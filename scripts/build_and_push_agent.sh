#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="${SCRIPT_DIR}/../MyHRAgent/app/agent"

REPO_NAME="hr-agent"
IMAGE_TAG="${1:-latest}"
IMAGE_URI_PARAM="/hr-leave-portal/agent-image-uri"
PLATFORM="linux/arm64"
CONTAINER_CLI="${CONTAINER_CLI:-docker}"

if ! command -v "${CONTAINER_CLI}" >/dev/null 2>&1; then
  echo "ERROR: '${CONTAINER_CLI}' not found on PATH." >&2
  exit 1
fi

REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-$(aws configure get region || true)}}"

if [[ -z "${REGION}" ]]; then
  echo "ERROR: No AWS region configured." >&2
  exit 1
fi

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE_URI="${REGISTRY}/${REPO_NAME}:${IMAGE_TAG}"

echo "Image: ${IMAGE_URI}"
echo "Platform: ${PLATFORM}"
echo "Build directory: ${AGENT_DIR}"

if ! aws ecr describe-repositories \
  --repository-names "${REPO_NAME}" \
  --region "${REGION}" >/dev/null 2>&1; then

  echo "Creating ECR repository..."

  aws ecr create-repository \
    --repository-name "${REPO_NAME}" \
    --region "${REGION}" \
    --image-scanning-configuration scanOnPush=true >/dev/null
fi

echo "Logging in to ECR..."

aws ecr get-login-password --region "${REGION}" \
  | "${CONTAINER_CLI}" login --username AWS --password-stdin "${REGISTRY}"

echo "Logging in to ECR Public..."

aws ecr-public get-login-password --region us-east-1 \
  | "${CONTAINER_CLI}" login --username AWS --password-stdin public.ecr.aws

echo "Building and pushing image..."

"${CONTAINER_CLI}" build \
  --platform "${PLATFORM}" \
  -t "${IMAGE_URI}" \
  "${AGENT_DIR}"

"${CONTAINER_CLI}" push "${IMAGE_URI}"

echo "Saving image URI in SSM Parameter Store..."

aws ssm put-parameter \
  --name "${IMAGE_URI_PARAM}" \
  --type String \
  --overwrite \
  --value "${IMAGE_URI}" \
  --region "${REGION}" >/dev/null

echo "Done!"
echo "${IMAGE_URI}"
