# ==============================================================================
# Kalpak Solutions SaaS Platform - Terraform Infrastructure Scaffolding
# ==============================================================================
# This directory contains baseline infrastructure-as-code definitions.
# Target cloud providers: AWS / GCP (Managed PostgreSQL, Redis, Container Service).

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    # aws = {
    #   source  = "hashicorp/aws"
    #   version = "~> 5.0"
    # }
  }
}

# Variable definitions placeholder
variable "environment" {
  type        = string
  description = "Target deployment environment (staging, production)"
  default     = "staging"
}

variable "project_name" {
  type        = string
  description = "Project name tag"
  default     = "kalpak-saas-platform"
}
